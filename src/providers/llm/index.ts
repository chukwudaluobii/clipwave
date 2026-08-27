import { env } from "@/config/env";
import type { MomentCandidate, PostMeta, Transcript, Word } from "../types";
import { StubLLM } from "./stub";
import { OpenAILLM } from "./openai";
import { AnthropicLLM } from "./anthropic";
import { GeminiLLM } from "./gemini";
import { OpenRouterLLM } from "./openrouter";

export interface DetectOptions {
  /** How many clip candidates to return. */
  maxClips?: number;
  /** Target clip length bounds in seconds. */
  minSec?: number;
  maxSec?: number;
}

export interface LLMProvider {
  /** Score the transcript and return ranked viral-moment candidates. */
  detectMoments(t: Transcript, opts?: DetectOptions): Promise<MomentCandidate[]>;
  /** Generate platform post copy (title/description/hashtags) for a clip. */
  generatePostMeta(args: {
    clipTitle: string;
    transcriptText: string;
    platform: string;
  }): Promise<PostMeta>;
  /** Translate word-level caption cues into `targetLang`, preserving timing. */
  translateCaptions(words: Word[], targetLang: string): Promise<Word[]>;
}

let _llm: LLMProvider | null = null;

export function llm(): LLMProvider {
  if (_llm) return _llm;
  if (env.providers.llm === "openai" && env.openaiApiKey) _llm = new OpenAILLM();
  else if (env.providers.llm === "anthropic" && env.anthropicApiKey) _llm = new AnthropicLLM();
  else if (env.providers.llm === "gemini" && env.geminiApiKey) _llm = new GeminiLLM();
  else if (env.providers.llm === "openrouter" && env.openrouterApiKey) _llm = new OpenRouterLLM();
  else _llm = new StubLLM();
  return _llm;
}
