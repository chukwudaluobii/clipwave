import OpenAI from "openai";
import { env } from "@/config/env";
import type { MomentCandidate, PostMeta, Transcript, Word } from "../types";
import type { DetectOptions, LLMProvider } from "./index";
import { momentSystemPrompt, momentUserPrompt, postMetaPrompt } from "./prompt";

export class OpenRouterLLM implements LLMProvider {
  private client = new OpenAI({
    apiKey: env.openrouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
  private model = env.openrouterModel;

  async detectMoments(t: Transcript, opts?: DetectOptions): Promise<MomentCandidate[]> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: momentSystemPrompt() },
        { role: "user", content: momentUserPrompt(t, opts) },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    return (parsed.clips ?? []).slice(0, opts?.maxClips ?? 5);
  }

  async generatePostMeta(args: {
    clipTitle: string;
    transcriptText: string;
    platform: string;
  }): Promise<PostMeta> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: postMetaPrompt(args) }],
    });
    return JSON.parse(res.choices[0]?.message?.content ?? "{}");
  }

  async translateCaptions(words: Word[], targetLang: string): Promise<Word[]> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `Translate each token to ${targetLang}, keep array length and order. Input: ${JSON.stringify(
            words.map((w) => w.text),
          )}. Respond {"tokens":string[]}.`,
        },
      ],
    });
    const out = JSON.parse(res.choices[0]?.message?.content ?? "{}").tokens ?? [];
    return words.map((w, i) => ({ ...w, text: out[i] ?? w.text }));
  }
}
