# Clipwave 🌊

**Turn long-form videos into scroll-stopping vertical shorts — automatically.**

Clipwave ingests a YouTube URL or an uploaded video, transcribes it, uses an LLM to find
the most "viral" moments, cuts them into 9:16 clips with face-tracking and burned-in
captions, then lets you schedule and publish to TikTok, YouTube Shorts, and Instagram
Reels. It ships with credits-based billing on Stripe.

> ⚠️ **Branding & rights:** Clipwave is original branding for this project. **Only process
> content you own or are authorized to repurpose.** The app requires you to confirm rights
> before every job and surfaces platform-ToS / copyright reminders throughout the UI.

---

## ✨ Features

- **Ingestion** — YouTube URL or direct upload, with a configurable max source duration.
- **Transcription** — Word-level timestamped transcript behind a swappable provider interface.
- **Moment detection** — LLM scores segments for virality (hooks, emotional peaks, complete
  thoughts, quotable lines) and returns ranked clip candidates + suggested titles.
- **Clip rendering** — FFmpeg cuts each segment, reframes to 9:16 via an auto-crop /
  face-tracking module (interface + heuristic stub), burns styled word-level captions, and
  can add a hook-title overlay and a bottom **game-video overlay**.
- **Captions** — Selectable templates; translate caption text into 30+ languages while
  keeping the original audio.
- **Scheduling & publishing** — Calendar view; TikTok / YouTube / Instagram integrations
  stubbed behind interfaces; AI-generated title, description, and hashtags.
- **Credits & billing** — 1 credit ≈ 20 minutes of source video. Per-plan balances enforced
  via a credit ledger. Stripe Checkout + webhooks. **Prices are config-driven.**
- **Channel Automation** — interface + worker hook to monitor a YouTube channel and
  auto-clip / auto-post new uploads (stubbed poller included).

Prices are intentionally low (~10% of a reference product) and live in
[`src/config/pricing.ts`](src/config/pricing.ts) so you can edit them freely.

---

## 🏗️ Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full diagram and data model. In short:

```
Next.js (App Router)  ──API routes──►  Postgres (Prisma)
        │                                   ▲
        │ enqueue job                       │ ledger / status
        ▼                                   │
   Redis  ──BullMQ──►  Worker  ── ingest → transcribe → detect → render → store
                                   │            │          │         │
                              providers/   transcription  llm    ffmpeg + facetrack
                                   └──────── storage (local | S3) ──────┘
```

Every third-party touchpoint is behind an interface in [`src/providers/`](src/providers):
`transcription`, `llm`, `storage`, `social`, `facetrack`. Each ships with a working **stub**
so the whole pipeline runs end-to-end with **zero API keys**.

---

## 🚀 Quick start

Clipwave runs in **inline mode** by default: the web server does ingestion, transcription,
moment detection, and ffmpeg rendering itself — **no Redis and no separate worker process.**

### Option A — Everything in one command (recommended)

Requires only Docker. Brings up Postgres + the app (with ffmpeg + yt-dlp baked in), runs
migrations automatically, and connects the frontend to the database for you:

```bash
docker compose -f docker-compose.full.yml up --build
```

Open **http://localhost:3000** and **sign in with any email** — new users automatically get a
Starter plan + 60 welcome credits. Paste a YouTube URL or upload a file, check the rights box,
and watch the pipeline run. The transcript/moment-detection are synthetic in stub mode, but the
**render step is real** — you get actual 9:16 mp4 clips with burned-in captions.

### Option B — Local dev (hot reload)

Prerequisites: Node ≥ 20, npm, and **FFmpeg + ffprobe** on your PATH (`ffmpeg -version`).

```bash
npm install
cp .env.example .env                 # works as-is (inline mode, stub providers, no keys)

# You need a Postgres. Easiest is just the db from Docker:
docker compose up -d db              # or point DATABASE_URL at any Postgres (e.g. Neon, Supabase)

npm run prisma:generate
npm run prisma:migrate               # create tables
npm run dev                          # → http://localhost:3000  (that's it — no worker!)
```

> No Postgres/Docker at all? Create a free cloud database at neon.tech or supabase.com, paste
> its connection string into `DATABASE_URL`, run `npm run prisma:migrate`, then `npm run dev`.
> `npm run db:seed` optionally adds a `demo@clipwave.app` account.

### Scaling rendering (optional) — Redis + dedicated worker

For heavy/parallel rendering, switch to the durable queue:

```bash
# .env:  QUEUE_DRIVER=bullmq
docker compose up -d                 # Postgres + Redis
npm run dev                          # web app
npm run worker                       # dedicated render worker (+ channel-automation poller)
```

---

## ☁️ Run it fully online

Because inline mode needs no Redis/worker, Clipwave deploys as **a single container** to any
Docker host. The image ([Dockerfile](Dockerfile)) bundles ffmpeg + yt-dlp and runs DB
migrations on boot; new users self-provision on sign-in, so there's no manual setup after
deploy.

**One-click on Render** (managed Postgres included): push this repo, then in Render →
**New → Blueprint** and select it. Render reads [render.yaml](render.yaml), provisions the
database, builds the image, and starts the app. Open the service URL and sign in.

**Any other host** (Railway, Fly.io, Koyeb, a VPS, etc.):

```bash
docker build -t clipwave .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e NEXTAUTH_SECRET="$(openssl rand -hex 32)" \
  -e APP_URL="https://your-domain" -e NEXTAUTH_URL="https://your-domain" \
  -v clipwave_storage:/data/storage \
  clipwave
```

To make it a *real* product online, set two things in the host's env:
- **AI:** `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (moment detection & copy) and
  `TRANSCRIPTION_PROVIDER=openai` + `OPENAI_API_KEY` (Whisper).
- **Durable storage:** host disks are ephemeral, so rendered clips vanish on redeploy. Set
  `STORAGE_PROVIDER=s3` + the `S3_*` vars (AWS S3, Cloudflare R2, etc.) to persist output.

> Note: platforms with short serverless timeouts (e.g. Vercel functions) aren't a good fit for
> inline rendering of long videos — use a container host, or run `QUEUE_DRIVER=bullmq` with a
> separate worker service. ffmpeg rendering is CPU/RAM-heavy, so pick a paid instance tier.

## 📲 Test from your phone (Cloudflare)

> **Why not Cloudflare Pages/Workers?** Those run on the V8 **edge runtime**, which can't run
> **ffmpeg**, Node `fs`/`child_process`, or Prisma's query engine — so the rendering backend
> can't live on Workers. The right Cloudflare tool here is a **Tunnel**: it publishes your
> running server (with ffmpeg and everything) at a public HTTPS URL you can open on any phone.
> Cloudflare **R2** is still a great fit for durable clip **storage** (`STORAGE_PROVIDER=s3`).

**Fastest (temporary URL, no account):**

```bash
# terminal 1 — run the app locally (Option A or B above), then:
# terminal 2:
bash scripts/phone-tunnel.sh          # runs: cloudflared tunnel --url http://localhost:3000
```

It prints a `https://<random>.trycloudflare.com` URL. Set that as `NEXTAUTH_URL` **and**
`APP_URL` in `.env`, restart the app, and open the URL on your phone. Sign in with any email,
and use the browser's **Add to Home Screen** to install the PWA. (Clips use relative URLs, so
video plays through the tunnel with no other changes.)

**Stable URL (Cloudflare account + a domain):** create a named tunnel in the Cloudflare Zero
Trust dashboard, route it to `http://app:3000`, then run the whole thing — app, database, and
tunnel — together:

```bash
TUNNEL_TOKEN=your-token PUBLIC_URL=https://clipwave.yourdomain.com \
  docker compose -f docker-compose.full.yml -f docker-compose.tunnel.yml up --build
```

Now `https://clipwave.yourdomain.com` works from anywhere, including your phone, with a fixed
address (so `NEXTAUTH_URL` is set once, automatically, via `PUBLIC_URL`).

## 📱 Install as an app (PWA)

Clipwave is an installable Progressive Web App — run it in its own window from your
taskbar/dock, with an offline app shell.

- **Icons/manifest/service worker** are already wired up ([public/manifest.webmanifest](public/manifest.webmanifest),
  [public/sw.js](public/sw.js)). Icons are generated with `node scripts/gen-icons.mjs` (no image libs).
- **To install:** run the app (`npm run dev`, or `npm run build && npm start`), open
  http://localhost:3000, and either click the **Install Clipwave** button that appears, or use
  your browser's install action (Chrome/Edge: the ⊕ icon in the address bar; "Install app…").
  `localhost` counts as a secure context, so install works without HTTPS during development.
- **Offline:** the service worker caches the app shell and hashed assets, and serves
  [public/offline.html](public/offline.html) when navigation fails. API calls and media are
  always network-first (processing needs a live backend + worker).

> In production, PWAs require HTTPS. Deploy behind TLS and the install prompt works everywhere.

## 🔌 Going to production

Swap stubs for real providers by setting env vars — no code changes:

| Concern        | Env var                  | Options                  |
| -------------- | ------------------------ | ------------------------ |
| Transcription  | `TRANSCRIPTION_PROVIDER` | `stub`, `openai`, `gemini` |
| Moment LLM     | `LLM_PROVIDER`           | `stub`, `openai`, `anthropic`, `gemini` |
| Object storage | `STORAGE_PROVIDER`       | `local`, `s3`            |

**Cheapest real-AI setup — Gemini (one key does both):** Gemini Flash is inexpensive and has a
free tier. Set `LLM_PROVIDER=gemini`, `TRANSCRIPTION_PROVIDER=gemini`, and `GEMINI_API_KEY`
(from https://aistudio.google.com/apikey). `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
Note: transcription sends the audio track, so long videos use more tokens — the free tier can
return HTTP 429 (quota); wait for the reset, enable billing, or use `openai` (Whisper) for
long-form transcription.

Things explicitly **stubbed** (search the code for `TODO(integration)`):
- `src/providers/social/*` — TikTok / YouTube / Instagram publishing OAuth + upload.
- `src/providers/facetrack/*` — real face detection (ships with a center/heuristic crop).
- `src/automation/channel-poller.ts` — 24/7 YouTube channel monitoring.

### Stripe
1. Edit prices/credits in [`src/config/pricing.ts`](src/config/pricing.ts).
2. `npm run stripe:sync` creates products/prices in your Stripe account and prints the
   `STRIPE_PRICE_*` ids to paste into `.env`.
3. Point a Stripe webhook at `/api/stripe/webhook` (or use `stripe listen`).

---

## 🗂️ Project layout

```
prisma/            schema.prisma, migrations, seed.ts
src/
  app/             Next.js routes: landing, pricing, dashboard, editor, calendar, billing, api/*
  components/      UI building blocks
  config/          pricing.ts, env.ts
  lib/             prisma, queue, credits, auth, session
  providers/       storage | transcription | llm | social | facetrack (interfaces + impls)
  pipeline/        ingest → transcribe → detect → render stages
  automation/      channel monitoring
worker/            BullMQ worker entrypoint
scripts/           stripe price sync
```

## 🧪 What's real vs stubbed (honesty matters)

- ✅ **Real:** DB schema + migrations, credit ledger math, queue/worker, FFmpeg 9:16
  rendering with word-level captions + overlays, Stripe checkout/webhook flow, all UI pages.
- 🟡 **Stub (clearly marked):** social publishing, face *detection* (crop is real), the
  channel poller, and — unless you set keys — transcription/LLM (synthetic but well-formed).

## 📜 License & responsible use
For educational/MVP use. You are responsible for complying with the source platform's Terms
of Service and copyright law. Clipwave will not help you repurpose content you don't own.
