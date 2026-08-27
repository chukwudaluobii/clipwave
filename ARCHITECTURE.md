# Clipwave — Architecture & Data Model

## 1. System overview

Clipwave is a single Next.js (App Router) application plus a separate BullMQ worker process.
They share the same TypeScript source (`src/lib`, `src/providers`, `src/pipeline`) and the
same Postgres database via Prisma. Redis is the queue broker.

```
            ┌──────────────────────────────────────────────────────────┐
            │                     Next.js (App Router)                  │
   Browser ─┤  Landing · Pricing · Dashboard · Editor · Calendar · Billing
            │  API routes: /api/projects /api/upload /api/schedule       │
            │              /api/stripe/{checkout,webhook} /api/social     │
            └───────┬───────────────────────────────┬───────────────────┘
                    │ Prisma                          │ queue.add(job)
                    ▼                                 ▼
              ┌───────────┐                     ┌───────────┐
              │ Postgres  │◄────status/ledger───│   Redis   │
              └───────────┘                     └─────┬─────┘
                    ▲                                 │ BullMQ
                    │                                 ▼
                    │                          ┌─────────────┐
                    └──────── writes ──────────│   Worker    │
                                               │  pipeline   │
                                               └──────┬──────┘
                                                      │
        ┌──────────────┬───────────────┬─────────────┴──────────┬───────────────┐
        ▼              ▼               ▼                         ▼               ▼
   ingest()      transcribe()     detectMoments()           render()        storage
   (yt/upload)   TranscriptionP.   LLMProvider            FFmpeg+FaceTrack   StorageProvider
```

### Why this shape
- **API routes stay fast** — they validate, debit/credit-check, write rows, and enqueue.
  No long work happens in a request.
- **Worker owns long jobs** — download, transcription, LLM calls, and FFmpeg renders can
  take minutes. They run in BullMQ with retries and per-stage progress.
- **Providers are interfaces** — every external dependency (speech-to-text, LLM, object
  storage, social publishing, face detection) is an interface with a `stub` implementation,
  so the happy path runs with no keys and any provider can be swapped via env config.

## 2. Processing pipeline (stages)

A `Project` job runs these stages in order; each updates `Project.status` and `progress`:

1. **ingest** — Resolve a YouTube URL (via `youtube-dl-exec`) or a previously-uploaded file
   to a local source `.mp4`. Probe duration; enforce `MAX_SOURCE_MINUTES`. **Debit credits**
   = `ceil(minutes / 20)` against the user's ledger (refunded if the job fails).
2. **transcribe** — `TranscriptionProvider.transcribe(audio)` → word-level segments.
3. **detect** — `LLMProvider.detectMoments(transcript)` → ranked candidates with
   `{ startSec, endSec, title, score, reason }`. Persisted as `Clip` rows (status `PENDING`).
4. **render** — For each selected clip: FFmpeg trims → reframes to 9:16 using
   `FaceTracker.plan()` crop windows → burns word-level captions (template-styled) → optional
   hook-title + bottom game-overlay → uploads result via `StorageProvider`. Clip → `READY`.
5. **metadata** — `LLMProvider.generatePostMeta()` → title/description/hashtags per clip,
   used to pre-fill the scheduler.

Failures mark the project `FAILED`, refund debited credits, and surface the error in the UI.

## 3. Provider interfaces (`src/providers`)

| Interface             | Methods (key)                              | Stub behavior                          | Prod impls           |
| --------------------- | ------------------------------------------ | -------------------------------------- | -------------------- |
| `StorageProvider`     | `put`, `get`, `presignGet`, `url`          | writes under `LOCAL_STORAGE_DIR`       | S3-compatible        |
| `TranscriptionProvider` | `transcribe(file) → Transcript`          | deterministic synthetic transcript     | OpenAI Whisper       |
| `LLMProvider`         | `detectMoments`, `generatePostMeta`, `translateCaptions` | heuristic / templated      | OpenAI, Anthropic    |
| `FaceTracker`         | `plan(video, target) → CropWindow[]`       | centered/heuristic crop                | MediaPipe/face-api   |
| `SocialPublisher`     | `connectUrl`, `publish`, `me`              | logs + fake post id                    | TikTok/YouTube/IG    |

Selection happens in each provider's `index.ts` factory, driven by `src/config/env.ts`.

## 4. Data model (Prisma)

```
User ──1:1── Subscription
  │            │ plan (STARTER|PLUS|BUSINESS|SCALE), status, stripe ids, period
  │
  ├──1:N── CreditLedger     (delta, reason, balanceAfter)  ← single source of truth for credits
  ├──1:N── SocialAccount    (platform, handle, tokens[stub], status)
  └──1:N── Project ──1:N── Clip ──1:N── ScheduledPost
                │            │             │ platform, scheduledAt, status, externalId
                │            │ start/end, title, score, captionTemplate, captionsJson,
                │            │ translations, renderKey (storage), thumbKey
                │ source (YOUTUBE|UPLOAD), sourceUrl/Key, durationSec, status, progress
```

**Credits are derived, never stored as a mutable counter.** Balance = sum of
`CreditLedger.delta`. Plan grants, job debits, and refunds are all ledger rows, which makes
billing auditable. A cached `balance` is exposed via a helper that sums the ledger.

### Enums
- `Plan`: `STARTER | PLUS | BUSINESS | SCALE`
- `ProjectSource`: `YOUTUBE | UPLOAD`
- `ProjectStatus`: `QUEUED | INGESTING | TRANSCRIBING | DETECTING | RENDERING | READY | FAILED`
- `ClipStatus`: `PENDING | RENDERING | READY | FAILED`
- `SocialPlatform`: `TIKTOK | YOUTUBE | INSTAGRAM`
- `PostStatus`: `DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED`
- `LedgerReason`: `PLAN_GRANT | SIGNUP_BONUS | JOB_DEBIT | JOB_REFUND | MANUAL_ADJUST`

## 5. Credits & billing

- 1 credit ≈ 20 minutes of **source** video. `creditsForMinutes(min) = max(1, ceil(min/20))`.
- Plans grant a yearly credit bucket on subscription create/renew (`PLAN_GRANT` ledger row).
- Stripe Checkout (subscription mode) → webhook (`checkout.session.completed`,
  `customer.subscription.updated/deleted`, `invoice.paid`) updates `Subscription` and writes
  grant rows. Prices/credits are config (`src/config/pricing.ts`); `scripts/sync-stripe-prices.ts`
  pushes them to Stripe and returns price ids.

## 6. Security / rights posture
- Every project create requires `rightsConfirmed = true` (checkbox) — enforced API-side.
- ToS/copyright reminders are rendered in upload + publish flows.
- Social tokens are stored encrypted-at-rest in production (stub stores placeholders only).
