import type { MomentCandidate, PostMeta, Transcript, Word } from "../types";
import type { DetectOptions, LLMProvider } from "./index";

/**
 * Heuristic, dependency-free LLM stand-in. It scores transcript segments using cheap signals
 * that correlate with "hooks" (question marks, numbers, emotional/curiosity words, segment
 * completeness) so the rest of the pipeline produces sensible clips with no API key.
 */
const HOOK_WORDS = [
  "you", "never", "secret", "mistake", "biggest", "nobody", "shocked", "exact",
  "framework", "magic", "realized", "breakthrough", "wrong", "tried", "changed",
];

export class StubLLM implements LLMProvider {
  async detectMoments(t: Transcript, opts?: DetectOptions): Promise<MomentCandidate[]> {
    const minSec = opts?.minSec ?? 15;
    const maxSec = opts?.maxSec ?? 45;
    const maxClips = opts?.maxClips ?? 5;

    // Build candidate windows by greedily merging segments up to maxSec.
    const windows: { start: number; end: number; text: string }[] = [];
    let cur: { start: number; end: number; text: string } | null = null;
    for (const s of t.segments) {
      if (!cur) cur = { start: s.startSec, end: s.endSec, text: s.text };
      else if (s.endSec - cur.start <= maxSec) {
        cur.end = s.endSec;
        cur.text += " " + s.text;
      } else {
        windows.push(cur);
        cur = { start: s.startSec, end: s.endSec, text: s.text };
      }
    }
    if (cur) windows.push(cur);

    const scored = windows
      .filter((w) => w.end - w.start >= minSec)
      .map((w) => {
        const lower = w.text.toLowerCase();
        const hookHits = HOOK_WORDS.filter((h) => lower.includes(h)).length;
        const hasQuestion = /\?/.test(w.text) ? 12 : 0;
        const hasNumber = /\d/.test(w.text) ? 8 : 0;
        const lenBonus = Math.max(0, 10 - Math.abs(28 - (w.end - w.start)));
        const score = Math.min(
          98,
          40 + hookHits * 6 + hasQuestion + hasNumber + lenBonus,
        );
        return {
          startSec: +w.start.toFixed(2),
          endSec: +w.end.toFixed(2),
          title: titleFrom(w.text),
          score,
          reason: `Strong hook signals (${hookHits} curiosity words${
            hasQuestion ? ", question" : ""
          }${hasNumber ? ", specifics" : ""}).`,
        } satisfies MomentCandidate;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxClips);

    return scored;
  }

  async generatePostMeta(args: {
    clipTitle: string;
    transcriptText: string;
    platform: string;
  }): Promise<PostMeta> {
    const base = args.clipTitle.replace(/[.?!]+$/, "");
    return {
      title: base.length > 60 ? base.slice(0, 57) + "..." : base,
      description: `${base} 👀 Full video on the channel. #${args.platform.toLowerCase()}`,
      hashtags: ["#shorts", "#viral", "#fyp", "#clip", "#contentcreator"],
    };
  }

  async translateCaptions(words: Word[], targetLang: string): Promise<Word[]> {
    // Stub: tag each word so the UI can show translation wiring without a real MT call.
    return words.map((w) => ({ ...w, text: `[${targetLang}] ${w.text}` }));
  }
}

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const firstSentence = clean.split(/(?<=[.?!])\s/)[0] ?? clean;
  const t = firstSentence.replace(/[.?!]+$/, "");
  return t.length > 70 ? t.slice(0, 67) + "..." : t;
}
