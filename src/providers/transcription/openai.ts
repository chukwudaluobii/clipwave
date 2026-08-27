import { createReadStream } from "fs";
import OpenAI from "openai";
import { env } from "@/config/env";
import type { Transcript, TranscriptSegment, Word } from "../types";
import type { TranscriptionProvider } from "./index";

/**
 * OpenAI Whisper transcription with word-level timestamps.
 * Swap freely for AssemblyAI, Deepgram, etc. by implementing TranscriptionProvider.
 */
export class OpenAITranscription implements TranscriptionProvider {
  private client = new OpenAI({ apiKey: env.openaiApiKey });

  async transcribe(localPath: string, opts?: { language?: string }): Promise<Transcript> {
    const res: any = await this.client.audio.transcriptions.create({
      file: createReadStream(localPath) as any,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
      language: opts?.language,
    });

    const words: Word[] = (res.words ?? []).map((w: any) => ({
      text: w.word,
      startSec: w.start,
      endSec: w.end,
    }));

    const segments: TranscriptSegment[] = (res.segments ?? []).map((s: any) => ({
      startSec: s.start,
      endSec: s.end,
      text: s.text.trim(),
      words: words.filter((w) => w.startSec >= s.start && w.endSec <= s.end),
    }));

    return {
      language: res.language ?? opts?.language ?? "en",
      durationSec: res.duration ?? segments.at(-1)?.endSec ?? 0,
      segments,
    };
  }
}
