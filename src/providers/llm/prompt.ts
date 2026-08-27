import type { Transcript } from "../types";
import type { DetectOptions } from "./index";

/** Shared prompt builders so OpenAI and Anthropic impls stay in sync. */

export function momentSystemPrompt(): string {
  return [
    "You are a short-form video editor who finds the most viral moments in a long video.",
    "You score segments for: a strong HOOK in the first 2 seconds, emotional peaks,",
    "complete self-contained thoughts, quotable lines, and clear payoff.",
    "Return ONLY valid JSON. Each clip must start on a complete thought and end on a payoff.",
  ].join(" ");
}

export function momentUserPrompt(t: Transcript, opts?: DetectOptions): string {
  const maxClips = opts?.maxClips ?? 5;
  const minSec = opts?.minSec ?? 15;
  const maxSec = opts?.maxSec ?? 60;
  const lines = t.segments
    .map((s) => `[${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}] ${s.text}`)
    .join("\n");
  return [
    `Source duration: ${t.durationSec.toFixed(0)}s. Language: ${t.language}.`,
    `Find the top ${maxClips} clips, each ${minSec}-${maxSec}s long.`,
    "Transcript (timestamps in seconds):",
    lines,
    "",
    "Respond with JSON of shape:",
    `{"clips":[{"startSec":number,"endSec":number,"title":string,"score":number(0-100),"reason":string}]}`,
  ].join("\n");
}

export function postMetaPrompt(args: {
  clipTitle: string;
  transcriptText: string;
  platform: string;
}): string {
  return [
    `Write social copy for a ${args.platform} short titled "${args.clipTitle}".`,
    `Clip transcript: """${args.transcriptText.slice(0, 1500)}"""`,
    'Respond with JSON: {"title":string,"description":string,"hashtags":string[]}.',
    "Title <= 60 chars, punchy. 5-8 relevant hashtags.",
  ].join("\n");
}
