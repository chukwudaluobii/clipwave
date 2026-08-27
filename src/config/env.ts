/**
 * Centralized, typed access to environment configuration.
 * Validated lazily so the app boots in stub mode with an almost-empty .env.
 */

function str(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}
function num(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  appUrl: str("APP_URL", "http://localhost:3000"),
  databaseUrl: str("DATABASE_URL"),
  redisUrl: str("REDIS_URL", "redis://localhost:6379"),

  providers: {
    transcription: str("TRANSCRIPTION_PROVIDER", "stub") as "stub" | "openai" | "gemini",
    llm: str("LLM_PROVIDER", "stub") as "stub" | "openai" | "anthropic" | "gemini" | "openrouter",
    storage: str("STORAGE_PROVIDER", "local") as "local" | "s3",
  },

  openaiApiKey: str("OPENAI_API_KEY"),
  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  anthropicModel: str("ANTHROPIC_MODEL", "claude-opus-4-8"),
  // Gemini — one key powers both moment detection and transcription (cheap + free tier).
  geminiApiKey: str("GEMINI_API_KEY"),
  geminiModel: str("GEMINI_MODEL", "gemini-2.5-flash"),
  openrouterApiKey: str("OPENROUTER_API_KEY"),
  openrouterModel: str("OPENROUTER_MODEL", "openai/gpt-4o-mini"),

  s3: {
    endpoint: str("S3_ENDPOINT"),
    region: str("S3_REGION", "us-east-1"),
    bucket: str("S3_BUCKET", "clipwave"),
    accessKeyId: str("S3_ACCESS_KEY_ID"),
    secretAccessKey: str("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: str("S3_FORCE_PATH_STYLE", "true") === "true",
  },
  localStorageDir: str("LOCAL_STORAGE_DIR", "./.data/storage"),

  stripe: {
    secretKey: str("STRIPE_SECRET_KEY"),
    webhookSecret: str("STRIPE_WEBHOOK_SECRET"),
    publishableKey: str("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  },

  maxSourceMinutes: num("MAX_SOURCE_MINUTES", 180),
  ffmpegPath: str("FFMPEG_PATH", "ffmpeg"),
  ffprobePath: str("FFPROBE_PATH", "ffprobe"),
} as const;

export const isStubMode =
  env.providers.transcription === "stub" || env.providers.llm === "stub";
