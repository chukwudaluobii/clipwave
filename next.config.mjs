/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is for the Docker image (`node server.js`). It is OPT-IN because
  // `next start` against a standalone build mishandles streamed request bodies (multipart
  // uploads abort with ECONNABORTED). Local runs use a normal build so uploads work.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  // Allow building into an alternate dir (e.g. for a verification build alongside a running
  // instance). Defaults to ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // ffmpeg/aws-sdk/yt-dlp are used only server-side (API routes + worker + inline pipeline).
  experimental: {
    serverComponentsExternalPackages: [
      "@aws-sdk/client-s3",
      "youtube-dl-exec",
      "bullmq",
      "ioredis",
    ],
  },
};

export default nextConfig;
