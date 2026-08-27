# Clipwave — single-image build that runs the whole platform (inline mode).
# Includes ffmpeg for real rendering and yt-dlp for YouTube ingestion.

# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# youtube-dl-exec's preinstall script requires python3/python on PATH, which this slim
# base image doesn't have — safe to skip since yt-dlp ships as a standalone binary
# (downloaded via curl in the runner stage below), not the python-based youtube-dl.
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
RUN npm ci

# ---- builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Opt into Next.js standalone output for the container (`node server.js`).
ENV NEXT_OUTPUT_STANDALONE=1
RUN npx prisma generate && npm run build

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV QUEUE_DRIVER=inline
ENV STORAGE_PROVIDER=local
ENV LOCAL_STORAGE_DIR=/data/storage

# ffmpeg (+ ffprobe) and yt-dlp for the pipeline.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates unzip \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

# Deno — the JS runtime yt-dlp's EJS challenge solver uses to defeat YouTube's signature
# ciphers (https://github.com/yt-dlp/yt-dlp/wiki/EJS). Without it, nsig extraction fails or
# degrades (missing titles/formats) on many videos.
RUN curl -fsSL https://deno.com/install.sh | sh -s -- --yes \
  && mv /root/.deno/bin/deno /usr/local/bin/deno \
  && rm -rf /root/.deno

# Next.js standalone output + static assets + public + prisma (for migrate deploy at start).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /data/storage

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
ENTRYPOINT ["./docker-entrypoint.sh"]
