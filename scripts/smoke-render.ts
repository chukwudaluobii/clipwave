/**
 * Smoke test for the real render pipeline (no DB/Redis needed). Generates a synthetic 16:9
 * source with ffmpeg, then runs renderClip to produce a captioned 9:16 mp4 and probes it.
 * Run: npx tsx scripts/smoke-render.ts
 */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { renderClip } from "../src/pipeline/render";
import { probe, runFfmpeg } from "../src/pipeline/ffmpeg";
import type { TranscriptSegment } from "../src/providers/types";

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-smoke-"));
  const src = path.join(dir, "src.mp4");
  const out = path.join(dir, "out.mp4");

  console.log("1/3 generating 8s 1280x720 test source...");
  await runFfmpeg([
    "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=8",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src,
  ]);

  const segments: TranscriptSegment[] = [
    {
      startSec: 1, endSec: 5, text: "This is the hook nobody tells you about",
      words: "This is the hook nobody tells you about".split(" ").map((t, i) => ({
        text: t, startSec: 1 + i * 0.45, endSec: 1 + (i + 1) * 0.45,
      })),
    },
  ];

  console.log("2/3 rendering 9:16 clip with burned captions + hook title...");
  await renderClip({
    sourcePath: src,
    startSec: 1,
    endSec: 6,
    segments,
    outPath: out,
    captionTemplate: "bold",
    hookTitle: "You won't believe this",
  });

  const info = probe(out);
  const stat = await fs.stat(out);
  console.log("3/3 result:", {
    path: out,
    bytes: stat.size,
    width: info.width,
    height: info.height,
    durationSec: +info.durationSec.toFixed(2),
    hasAudio: info.hasAudio,
  });

  if (info.width !== 1080 || info.height !== 1920) throw new Error("Expected 1080x1920 output");
  if (stat.size < 1000) throw new Error("Output too small");
  console.log("\n✅ Render pipeline OK — produced a valid vertical clip.");
}

main().catch((e) => {
  console.error("❌ smoke test failed:", e);
  process.exit(1);
});
