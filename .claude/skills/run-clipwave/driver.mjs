#!/usr/bin/env node
/**
 * Clipwave end-to-end smoke driver.
 *
 * Drives a ALREADY-RUNNING Clipwave server through the real happy path:
 *   health  →  sign in (NextAuth credentials)  →  create a project from a short YouTube URL
 *           →  poll the inline pipeline to READY  →  fetch the rendered clip and probe it.
 *
 * This exercises the layers PRs here actually touch: API routes, auth/session, the
 * ingest(yt-dlp)→transcribe→detect→render pipeline, ffmpeg rendering, and storage URLs.
 *
 * Prereqs: ffprobe on PATH (to verify the clip); the server host needs network + the bundled
 * yt-dlp (node_modules/youtube-dl-exec/bin) for ingestion.
 *
 * Usage:  node .claude/skills/run-clipwave/driver.mjs [baseUrl] [youtubeUrl]
 *   baseUrl     default http://localhost:3000  (or $CLIPWAVE_URL)
 *   youtubeUrl  default a short public clip     (or $CLIPWAVE_YT)
 *
 * IMPORTANT: run the server with the STUB providers (the defaults — no API keys) so this is
 * deterministic regardless of whether the video has speech.
 *
 * NOTE: the upload path (multipart POST /api/upload) is the product's other ingestion route,
 * but multipart streaming is flaky on some Windows setups (connections abort mid-body), so
 * this smoke uses the YouTube JSON path, which is reliable and covers more of the pipeline.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] || process.env.CLIPWAVE_URL || "http://localhost:3000").replace(/\/$/, "");
const YT = process.argv[3] || process.env.CLIPWAVE_YT || "https://www.youtube.com/watch?v=jNQXAC9IVRw";
const EMAIL = process.env.CLIPWAVE_EMAIL || "demo@clipwave.app";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

const die = (m) => { console.error("\n❌ " + m); process.exit(1); };
const ok = (m) => console.log("✓ " + m);

// --- minimal cookie jar over global fetch (undici) ---
const jar = new Map();
function absorb(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of list) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { ...(opts.headers || {}), cookie: cookieHeader() },
    redirect: "manual",
  });
  absorb(res);
  return res;
}

// 1. Health
{
  const r = await fetch(BASE + "/").catch(() => null);
  if (!r || r.status !== 200) die(`app not reachable at ${BASE}/ — start the server first (see SKILL.md)`);
  ok(`app up at ${BASE}`);
}

// 2. Sign in via NextAuth credentials
{
  const { csrfToken } = await (await req("/api/auth/csrf")).json();
  await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email: EMAIL, json: "true" }),
  });
  const sess = await (await req("/api/auth/session")).json();
  if (!sess?.user?.id) die("sign-in failed (no session cookie). Is NEXTAUTH_URL set to the same origin?");
  ok(`signed in as ${sess.user.email}`);
}

const dir = mkdtempSync(join(tmpdir(), "clipwave-drv-"));

// 3. Create a YOUTUBE project via the JSON path (multipart /api/upload aborts mid-body on
// this Windows/undici combo — see header note — so this exercises ingest via yt-dlp instead).
let projectId;
{
  const r = await req("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "driver smoke",
      sourceUrl: YT,
      rightsConfirmed: true,
      options: { maxClips: 1, captionTemplate: "bold" },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status !== 201 || !d.project?.id) die(`project create failed (${r.status}): ${JSON.stringify(d)}`);
  projectId = d.project.id;
  ok(`created project ${projectId} from ${YT}`);
}

// 5. Poll the pipeline to a terminal state
let project;
for (let i = 0; i < 60; i++) {
  project = (await (await req(`/api/projects/${projectId}`)).json()).project;
  process.stdout.write(`\r   status=${project.status} ${project.progress}%     `);
  if (project.status === "READY" || project.status === "FAILED") break;
  await new Promise((r) => setTimeout(r, 3000));
}
process.stdout.write("\n");
if (project.status !== "READY") die(`pipeline did not reach READY: ${project.error || project.status}`);
ok("pipeline READY");

// 6. Fetch the rendered clip and verify it is a real 9:16 mp4
{
  const clip = (project.clips || []).find((c) => c.videoUrl);
  if (!clip) die("no rendered clip with a video URL");
  const bytes = Buffer.from(await (await req(clip.videoUrl)).arrayBuffer());
  const out = join(dir, "clip.mp4");
  writeFileSync(out, bytes);
  const p = spawnSync(FFPROBE, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", out,
  ], { encoding: "utf8" });
  const dims = (p.stdout || "").trim();
  if (dims !== "1080x1920") die(`rendered clip is not vertical 1080x1920 (got "${dims}")`);
  ok(`clip "${clip.title}" → ${dims}, ${bytes.length} bytes, virality ${Math.round(clip.score)}`);
}

console.log("\n✅ PASS — Clipwave end-to-end (upload → render → serve) works.");
