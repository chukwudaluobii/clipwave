import { env } from "@/config/env";
import type { MomentCandidate, PostMeta, Transcript, Word } from "../types";
import type { DetectOptions, LLMProvider } from "./index";
import { momentSystemPrompt, momentUserPrompt, postMetaPrompt } from "./prompt";

/**
 * Google Gemini moment detection via the Generative Language REST API. Uses plain fetch (no
 * SDK) like the Anthropic provider. Gemini Flash is inexpensive and has a free tier, which is
 * why it's a good default when you're trying to keep API costs down.
 */
export class GeminiLLM implements LLMProvider {
  private model = env.geminiModel;
  private base = "https://generativelanguage.googleapis.com/v1beta/models";

  private async generateJson(system: string, user: string): Promise<any> {
    const res = await fetch(
      `${this.base}/${this.model}:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return parseJson(text);
  }

  async detectMoments(t: Transcript, opts?: DetectOptions): Promise<MomentCandidate[]> {
    const parsed = await this.generateJson(momentSystemPrompt(), momentUserPrompt(t, opts));
    return (parsed.clips ?? []).slice(0, opts?.maxClips ?? 5);
  }

  async generatePostMeta(args: {
    clipTitle: string;
    transcriptText: string;
    platform: string;
  }): Promise<PostMeta> {
    return this.generateJson(
      "You write punchy social media copy. Respond only with JSON.",
      postMetaPrompt(args),
    );
  }

  async translateCaptions(words: Word[], targetLang: string): Promise<Word[]> {
    const out = await this.generateJson(
      "You are a translator. Respond only with JSON.",
      `Translate each token to ${targetLang}, keeping the array length and order identical. ` +
        `Input tokens: ${JSON.stringify(words.map((w) => w.text))}. Respond {"tokens":string[]}.`,
    );
    const tokens = out.tokens ?? [];
    return words.map((w, i) => ({ ...w, text: tokens[i] ?? w.text }));
  }
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}
