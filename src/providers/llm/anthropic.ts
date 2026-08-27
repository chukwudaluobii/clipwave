import { env } from "@/config/env";
import type { MomentCandidate, PostMeta, Transcript, Word } from "../types";
import type { DetectOptions, LLMProvider } from "./index";
import { momentSystemPrompt, momentUserPrompt, postMetaPrompt } from "./prompt";

/**
 * Anthropic (Claude) moment detection via the Messages API. Uses the default model id from
 * ANTHROPIC_MODEL (claude-opus-4-8). No SDK dependency required — plain fetch.
 */
export class AnthropicLLM implements LLMProvider {
  private model = env.anthropicModel;

  private async message(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "{}";
  }

  private parseJson(text: string): any {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : "{}");
  }

  async detectMoments(t: Transcript, opts?: DetectOptions): Promise<MomentCandidate[]> {
    const text = await this.message(
      momentSystemPrompt(),
      momentUserPrompt(t, opts),
    );
    return (this.parseJson(text).clips ?? []).slice(0, opts?.maxClips ?? 5);
  }

  async generatePostMeta(args: {
    clipTitle: string;
    transcriptText: string;
    platform: string;
  }): Promise<PostMeta> {
    const text = await this.message(
      "You write punchy social media copy. Respond only with JSON.",
      postMetaPrompt(args),
    );
    return this.parseJson(text);
  }

  async translateCaptions(words: Word[], targetLang: string): Promise<Word[]> {
    const text = await this.message(
      "You are a translator. Respond only with JSON.",
      `Translate each token to ${targetLang}, keep array length/order. Input: ${JSON.stringify(
        words.map((w) => w.text),
      )}. Respond {"tokens":string[]}.`,
    );
    const out = this.parseJson(text).tokens ?? [];
    return words.map((w, i) => ({ ...w, text: out[i] ?? w.text }));
  }
}
