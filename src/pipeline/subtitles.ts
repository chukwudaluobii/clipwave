import type { CaptionCue, CaptionStyle } from "./captions";
import { assTime } from "./ffmpeg";

/**
 * Build an ASS subtitle file with word-by-word highlighting for a 1080x1920 frame.
 * For each cue we emit one Dialogue event per word time-slice, re-coloring the active word —
 * this produces the familiar "pop" caption effect that drives retention.
 */
export function buildAss(
  cues: CaptionCue[],
  style: CaptionStyle,
  opts?: { hookTitle?: string; durationSec?: number },
): string {
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Main,${style.fontName},${style.fontSize},${style.primaryColor},${style.highlightColor},${style.outlineColor},&H64000000,${style.bold ? -1 : 0},0,0,0,100,100,0,0,1,${style.outline},${style.shadow},2,80,80,${style.marginV},1`,
    // Hook title style: top-center (\an8), opaque box (BorderStyle 3).
    `Style: Hook,${style.fontName},64,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA6000000,-1,0,0,0,100,100,0,0,3,8,0,8,60,60,180,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];

  // Hook title: persists for the whole clip across the top.
  if (opts?.hookTitle?.trim()) {
    const text = opts.hookTitle.trim().toUpperCase().replace(/[{}\\]/g, "");
    events.push(`Dialogue: 0,${assTime(0)},${assTime(opts.durationSec ?? 60)},Hook,,0,0,0,,${text}`);
  }
  for (const cue of cues) {
    const words = cue.words.length
      ? cue.words
      : [{ text: cue.text, startSec: cue.startSec, endSec: cue.endSec }];
    for (let i = 0; i < words.length; i++) {
      const active = words[i];
      const start = assTime(active.startSec);
      const end = assTime(i + 1 < words.length ? words[i + 1].startSec : active.endSec);
      const text = words
        .map((w, j) => {
          const t = style.uppercase ? w.text.toUpperCase() : w.text;
          const safe = t.replace(/[{}\\]/g, "");
          return j === i ? `{\\c${style.highlightColor}}${safe}{\\c${style.primaryColor}}` : safe;
        })
        .join(" ");
      events.push(`Dialogue: 0,${start},${end},Main,,0,0,0,,${text}`);
    }
  }

  return [...header, ...events].join("\n") + "\n";
}
