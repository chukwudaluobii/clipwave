import { spawnSync } from "child_process";
import { env } from "@/config/env";
import type { Transcript, TranscriptSegment, Word } from "../types";
import type { TranscriptionProvider } from "./index";

/**
 * Deterministic synthetic transcript — no API key required. It probes the real media
 * duration with ffprobe and lays down believable, evenly-spaced word-level segments so the
 * rest of the pipeline (moment detection, caption rendering) has real timing to work with.
 */
export class StubTranscription implements TranscriptionProvider {
  async transcribe(localPath: string, opts?: { language?: string }): Promise<Transcript> {
    const durationSec = probeDuration(localPath) || 600;
    const segments = buildSegments(durationSec);
    return { language: opts?.language ?? "en", durationSec, segments };
  }
}

function probeDuration(file: string): number {
  try {
    const r = spawnSync(
      env.ffprobePath,
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
      { encoding: "utf8" },
    );
    const v = parseFloat((r.stdout || "").trim());
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

const SENTENCES = [
  "Here is the one thing nobody tells you about getting started.",
  "I tried this every single day for a month and the results shocked me.",
  "The biggest mistake people make is quitting right before the breakthrough.",
  "Let me show you the exact framework that changed everything for me.",
  "This is the part most people completely skip and it costs them.",
  "If you only remember one thing from today let it be this.",
  "I almost gave up here but then something clicked.",
  "Watch closely because this next step is where the magic happens.",
  "Most experts get this wrong and I used to as well.",
  "That moment was when I realized the whole approach was backwards.",
];

function buildSegments(durationSec: number): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let t = 0;
  let i = 0;
  while (t < durationSec - 1) {
    const sentence = SENTENCES[i % SENTENCES.length];
    const tokens = sentence.split(" ");
    const segLen = Math.min(durationSec - t, 4 + (i % 3));
    const per = segLen / tokens.length;
    const words: Word[] = tokens.map((text, k) => ({
      text,
      startSec: +(t + k * per).toFixed(2),
      endSec: +(t + (k + 1) * per).toFixed(2),
    }));
    segments.push({
      startSec: +t.toFixed(2),
      endSec: +(t + segLen).toFixed(2),
      text: sentence,
      words,
    });
    t += segLen + 0.3;
    i++;
  }
  return segments;
}
