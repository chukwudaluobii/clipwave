import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { env } from "@/config/env";
import { probe, runFfmpeg } from "@/pipeline/ffmpeg";
import type { Transcript, TranscriptSegment, Word } from "../types";
import type { TranscriptionProvider } from "./index";

/**
 * Transcription with Google Gemini (multimodal audio understanding). We first extract a small
 * mono/low-bitrate audio track with ffmpeg, then send it inline to Gemini and ask for a
 * timestamped transcript. Word-level timings are interpolated within each returned segment,
 * which is accurate enough for burned-in captions.
 *
 * One GEMINI_API_KEY covers this and moment detection — handy for keeping costs low.
 */
const MAX_INLINE_BYTES = 18 * 1024 * 1024; // Gemini inline request practical ceiling.

export class GeminiTranscription implements TranscriptionProvider {
  private model = env.geminiModel;
  private base = "https://generativelanguage.googleapis.com/v1beta/models";

  async transcribe(localPath: string, opts?: { language?: string }): Promise<Transcript> {
    const durationSec = probe(localPath).durationSec || 0;

    // 1. Extract compact audio (mono, 16kHz, 48kbps mp3) to minimize payload size.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-gem-"));
    const audioPath = path.join(dir, "audio.mp3");
    try {
      await runFfmpeg(["-i", localPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", audioPath]);
      const bytes = await fs.readFile(audioPath);
      if (bytes.length > MAX_INLINE_BYTES) {
        throw new Error(
          `Audio is ${(bytes.length / 1e6).toFixed(1)}MB, over the inline limit. Use a shorter ` +
            `source or switch TRANSCRIPTION_PROVIDER to openai for long videos.`,
        );
      }

      // 2. Ask Gemini for a timestamped transcript as JSON.
      const res = await fetch(
        `${this.base}/${this.model}:generateContent?key=${env.geminiApiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You are a precise speech-to-text engine. Transcribe the spoken words in the " +
                    "audio with accurate timestamps. Respond ONLY with JSON.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: "audio/mp3", data: bytes.toString("base64") } },
                  {
                    text:
                      "Transcribe this audio. Return JSON of shape " +
                      '{"language":string,"segments":[{"startSec":number,"endSec":number,"text":string}]}. ' +
                      "Segments should be short phrases (a few seconds each), in order, covering the whole audio. " +
                      "Timestamps are in seconds from the start.",
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0 },
          }),
        },
      );
      if (!res.ok) throw new Error(`Gemini transcription error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const parsed = safeParse(text);

      const segments: TranscriptSegment[] = (parsed.segments ?? [])
        .filter((s: any) => typeof s.text === "string" && s.text.trim())
        .map((s: any) => interpolateWords(s.startSec, s.endSec, s.text));

      if (!segments.length) throw new Error("Gemini returned no transcript segments.");

      return {
        language: parsed.language ?? opts?.language ?? "en",
        durationSec: durationSec || segments.at(-1)!.endSec,
        segments,
      };
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** Distribute words evenly across a segment's time span for word-level captions. */
function interpolateWords(startSec: number, endSec: number, text: string): TranscriptSegment {
  const tokens = text.trim().split(/\s+/);
  const span = Math.max(0.4, (endSec ?? startSec) - startSec);
  const per = span / tokens.length;
  const words: Word[] = tokens.map((t, i) => ({
    text: t,
    startSec: +(startSec + i * per).toFixed(2),
    endSec: +(startSec + (i + 1) * per).toFixed(2),
  }));
  return { startSec, endSec: startSec + span, text: text.trim(), words };
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}
