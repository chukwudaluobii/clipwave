import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { ProjectSource } from "@prisma/client";
import { storage } from "@/providers/storage";
import { env } from "@/config/env";
import { probe } from "./ffmpeg";

export interface IngestResult {
  localPath: string;
  sourceKey: string;
  durationSec: number;
}

/**
 * Resolve a project's source to a local file the rest of the pipeline can read, and persist
 * the canonical source in object storage.
 *
 * - UPLOAD: the file was already streamed to storage at `sourceKey`; we just fetch it locally.
 * - YOUTUBE: download with yt-dlp (via youtube-dl-exec), then upload to storage.
 */
export async function ingest(project: {
  id: string;
  source: ProjectSource;
  sourceUrl: string | null;
  sourceKey: string | null;
}): Promise<IngestResult> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-ingest-"));
  const localPath = path.join(workDir, "source.mp4");

  let sourceKey = project.sourceKey ?? `sources/${project.id}/source.mp4`;

  if (project.source === ProjectSource.UPLOAD) {
    if (!project.sourceKey) throw new Error("Upload project missing sourceKey.");
    await storage().getFile(project.sourceKey, localPath);
  } else {
    if (!project.sourceUrl) throw new Error("YouTube project missing sourceUrl.");
    await downloadYouTube(project.sourceUrl, localPath);
    await storage().putFile(sourceKey, localPath, "video/mp4");
  }

  const info = probe(localPath);
  const maxSec = env.maxSourceMinutes * 60;
  if (info.durationSec > maxSec) {
    throw new Error(
      `Source is ${(info.durationSec / 60).toFixed(0)} min, exceeds max ${env.maxSourceMinutes} min.`,
    );
  }

  return { localPath, sourceKey, durationSec: info.durationSec };
}

/**
 * Locate the yt-dlp binary. Order: YTDLP_PATH env → the binary bundled with youtube-dl-exec →
 * "yt-dlp"/"yt-dlp.exe" on PATH.
 */
function resolveYtdlp(): string {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const isWin = process.platform === "win32";
  const name = isWin ? "yt-dlp.exe" : "yt-dlp";
  const bundled = path.join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    name,
  );
  try {
    require("fs").accessSync(bundled);
    return bundled;
  } catch {
    return name; // fall back to PATH
  }
}

async function downloadYouTube(url: string, outPath: string): Promise<void> {
  const { spawn } = await import("child_process");
  const bin = resolveYtdlp();
  const args = [
    url,
    "-o", outPath,
    "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "--merge-output-format", "mp4",
    "--no-playlist",
    // android_vr and web_safari don't gate video-stream URLs behind a PO token, unlike the
    // default web/mweb clients — avoids most "Sign in to confirm you're not a bot" failures
    // on datacenter IPs. See https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide.
    "--extractor-args", "youtube:player_client=android_vr,web_safari,android",
    // TODO(integration): cookies/age-gate handling, rate limiting, and ToS compliance.
  ];
  if (process.env.YTDLP_COOKIES_PATH) {
    args.push("--cookies", process.env.YTDLP_COOKIES_PATH);
  }
  // yt-dlp needs ffmpeg to merge separate video+audio streams. Only point it at an explicit
  // location when FFMPEG_PATH is a real path — otherwise let yt-dlp auto-detect it on PATH
  // (passing a bare "ffmpeg" makes yt-dlp think ffmpeg is missing and skip the merge).
  if (/[\\/]/.test(env.ffmpegPath)) {
    args.push("--ffmpeg-location", path.dirname(env.ffmpegPath));
  }

  await new Promise<void>((resolve, reject) => {
    // shell:false is important — Node passes the binary path straight to the OS, so spaces in
    // the path (e.g. "AI clipper") don't break invocation the way a shell would.
    const proc = spawn(bin, args, { shell: false });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e: any) => {
      reject(
        new Error(
          e?.code === "ENOENT"
            ? `yt-dlp not found (looked for "${bin}"). Install yt-dlp or set YTDLP_PATH.`
            : `YouTube download failed: ${e?.message ?? e}`,
        ),
      );
    });
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      const hint = /Sign in to confirm/i.test(stderr)
        ? " — YouTube is bot-checking this server's IP; set YTDLP_COOKIES_PATH to a cookies.txt from a signed-in account."
        : "";
      reject(new Error(`YouTube download failed (yt-dlp exit ${code}): ${stderr.slice(-600)}${hint}`));
    });
  });
}
