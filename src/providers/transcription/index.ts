import { env } from "@/config/env";
import type { Transcript } from "../types";
import { StubTranscription } from "./stub";
import { OpenAITranscription } from "./openai";
import { GeminiTranscription } from "./gemini";

export interface TranscriptionProvider {
  /**
   * Transcribe an audio/video file at `localPath` into a word-level timestamped transcript.
   */
  transcribe(localPath: string, opts?: { language?: string }): Promise<Transcript>;
}

let _t: TranscriptionProvider | null = null;

export function transcription(): TranscriptionProvider {
  if (_t) return _t;
  if (env.providers.transcription === "openai" && env.openaiApiKey) _t = new OpenAITranscription();
  else if (env.providers.transcription === "gemini" && env.geminiApiKey) _t = new GeminiTranscription();
  else _t = new StubTranscription();
  return _t;
}
