import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { env } from "@/config/env";

/**
 * Serves files from local storage (STORAGE_PROVIDER=local) so the browser has real URLs,
 * mirroring how S3 would serve them in production. Supports HTTP range requests for video.
 */
const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".vtt": "text/vtt",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string[] } },
) {
  const root = path.resolve(env.localStorageDir);
  const rel = params.key.map(decodeURIComponent).join("/");
  const filePath = path.join(root, rel);

  // Prevent path traversal outside the storage root.
  if (!filePath.startsWith(root)) {
    return new Response("Forbidden", { status: 403 });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    const chunk = await readSlice(filePath, start, end);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const data = await fs.readFile(filePath);
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Content-Length": String(stat.size), "Accept-Ranges": "bytes" },
  });
}

async function readSlice(file: string, start: number, end: number): Promise<Buffer> {
  const fh = await fs.open(file, "r");
  try {
    const len = end - start + 1;
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, start);
    return buf;
  } finally {
    await fh.close();
  }
}
