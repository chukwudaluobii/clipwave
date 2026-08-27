import { spawn, spawnSync } from "child_process";
import { env } from "@/config/env";

export interface VideoInfo {
  width: number;
  height: number;
  durationSec: number;
  hasAudio: boolean;
}

/** Probe a media file with ffprobe. */
export function probe(localPath: string): VideoInfo {
  const r = spawnSync(
    env.ffprobePath,
    [
      "-v", "error",
      "-show_entries", "stream=width,height,codec_type",
      "-show_entries", "format=duration",
      "-of", "json",
      localPath,
    ],
    { encoding: "utf8" },
  );
  let width = 0, height = 0, durationSec = 0, hasAudio = false;
  try {
    const data = JSON.parse(r.stdout || "{}");
    for (const s of data.streams ?? []) {
      if (s.codec_type === "video" && !width) {
        width = s.width ?? 0;
        height = s.height ?? 0;
      }
      if (s.codec_type === "audio") hasAudio = true;
    }
    durationSec = parseFloat(data.format?.duration ?? "0") || 0;
  } catch {
    /* leave defaults */
  }
  return { width, height, durationSec, hasAudio };
}

/** Run ffmpeg, streaming progress. Rejects on non-zero exit. */
export function runFfmpeg(
  args: string[],
  onProgress?: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(env.ffmpegPath, ["-hide_banner", "-y", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      onProgress?.(s);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/** Format seconds as ASS/ffmpeg timestamp H:MM:SS.cs */
export function assTime(sec: number): string {
  const cs = Math.round((sec % 1) * 100);
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
