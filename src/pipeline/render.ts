import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { faceTracker } from "@/providers/facetrack";
import type { TranscriptSegment } from "@/providers/types";
import {
  buildCaptionCues,
  CAPTION_TEMPLATES,
  type CaptionTemplate,
} from "./captions";
import { probe, runFfmpeg } from "./ffmpeg";
import { buildAss } from "./subtitles";

export interface RenderClipInput {
  sourcePath: string;
  startSec: number;
  endSec: number;
  segments: TranscriptSegment[];
  outPath: string;
  captionTemplate?: CaptionTemplate;
  hookTitle?: string;
  /** Local path to gameplay footage to composite along the bottom (engagement bait). */
  gameOverlayPath?: string;
  targetWidth?: number;
  targetHeight?: number;
  onProgress?: (line: string) => void;
}

/** Escape a filesystem path for use inside an ffmpeg filter (subtitles=...). */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/**
 * Render a single 9:16 clip with face-tracked reframing + burned-in word-level captions,
 * optional hook-title overlay and bottom gameplay overlay. This is REAL ffmpeg work — it
 * produces a playable mp4 regardless of whether AI providers are stubbed.
 */
export async function renderClip(input: RenderClipInput): Promise<void> {
  const TW = input.targetWidth ?? 1080;
  const TH = input.targetHeight ?? 1920;
  const duration = Math.max(1, input.endSec - input.startSec);

  const info = probe(input.sourcePath);
  const srcW = info.width || 1920;
  const srcH = info.height || 1080;

  // 1. Reframe plan (heuristic / face-tracking) → crop window in source pixels.
  const windows = await faceTracker().plan({
    sourceWidth: srcW,
    sourceHeight: srcH,
    targetWidth: TW,
    targetHeight: TH,
    durationSec: duration,
  });
  const crop = windows[0];

  // 2. Caption cues + ASS subtitle file (hook title is rendered via libass too, so we avoid
  // ffmpeg's drawtext, which needs an explicit fontfile and is fragile across platforms).
  const template = input.captionTemplate ?? "bold";
  const cues = buildCaptionCues(input.segments, input.startSec, input.endSec);
  const ass = buildAss(cues, CAPTION_TEMPLATES[template], {
    hookTitle: input.hookTitle,
    durationSec: duration,
  });
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-"));
  const assPath = path.join(tmpDir, "captions.ass");
  await fs.writeFile(assPath, ass, "utf8");

  // 3. Build filter graph.
  const hasGame = !!input.gameOverlayPath;
  const filters: string[] = [];

  // Main: crop to target AR, scale to canvas (full height, or top portion if game overlay).
  const mainH = hasGame ? Math.round(TH * 0.72) : TH;
  filters.push(
    `[0:v]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},` +
      `scale=${TW}:${mainH}:force_original_aspect_ratio=increase,` +
      `crop=${TW}:${mainH},setsar=1[main]`,
  );

  let videoLabel = "main";
  if (hasGame) {
    const gameH = TH - mainH;
    filters.push(
      `[1:v]scale=${TW}:${gameH}:force_original_aspect_ratio=increase,` +
        `crop=${TW}:${gameH},setsar=1[game]`,
    );
    filters.push(`[main][game]vstack=inputs=2[stacked]`);
    videoLabel = "stacked";
  }

  // Burn captions + hook title (both via libass).
  filters.push(`[${videoLabel}]subtitles='${escapeFilterPath(assPath)}',format=yuv420p[v]`);

  // 4. Inputs + run. -ss before -i for fast seek; -t bounds duration.
  const args: string[] = ["-ss", String(input.startSec), "-t", String(duration), "-i", input.sourcePath];
  if (hasGame) {
    args.push("-stream_loop", "-1", "-t", String(duration), "-i", input.gameOverlayPath!);
  }
  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[v]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-shortest",
    input.outPath,
  );

  try {
    await runFfmpeg(args, input.onProgress);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Render a single representative thumbnail (first frame of the clip). */
export async function renderThumbnail(
  sourcePath: string,
  atSec: number,
  outPath: string,
): Promise<void> {
  await runFfmpeg([
    "-ss", String(atSec),
    "-i", sourcePath,
    "-frames:v", "1",
    "-vf", "scale=540:-1",
    outPath,
  ]);
}
