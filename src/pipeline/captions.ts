import type { TranscriptSegment, Word } from "@/providers/types";

export type CaptionTemplate = "bold" | "minimal" | "karaoke" | "neon";

export interface CaptionCue {
  startSec: number;
  endSec: number;
  text: string;
  words: Word[];
}

/** Visual styling per template, consumed by the ASS subtitle builder in render.ts. */
export interface CaptionStyle {
  fontName: string;
  fontSize: number; // relative to a 1080-wide frame
  primaryColor: string; // ASS &HBBGGRR
  highlightColor: string;
  outlineColor: string;
  outline: number;
  shadow: number;
  bold: boolean;
  uppercase: boolean;
  marginV: number; // vertical margin from bottom (px in 1920 frame)
}

export const CAPTION_TEMPLATES: Record<CaptionTemplate, CaptionStyle> = {
  bold: {
    fontName: "Arial",
    fontSize: 84,
    primaryColor: "&H00FFFFFF",
    highlightColor: "&H0030D5FF", // brand amber/blue accent
    outlineColor: "&H00000000",
    outline: 5,
    shadow: 2,
    bold: true,
    uppercase: true,
    marginV: 420,
  },
  minimal: {
    fontName: "Arial",
    fontSize: 64,
    primaryColor: "&H00FFFFFF",
    highlightColor: "&H00FFFFFF",
    outlineColor: "&H00000000",
    outline: 2,
    shadow: 0,
    bold: false,
    uppercase: false,
    marginV: 360,
  },
  karaoke: {
    fontName: "Arial",
    fontSize: 78,
    primaryColor: "&H00FFFFFF",
    highlightColor: "&H0000E5FF",
    outlineColor: "&H00101010",
    outline: 4,
    shadow: 1,
    bold: true,
    uppercase: true,
    marginV: 440,
  },
  neon: {
    fontName: "Arial",
    fontSize: 80,
    primaryColor: "&H00F5F0FF",
    highlightColor: "&H00FF5CF5",
    outlineColor: "&H00400040",
    outline: 5,
    shadow: 3,
    bold: true,
    uppercase: true,
    marginV: 430,
  },
};

/**
 * Build word-level caption cues for a clip window [startSec, endSec], grouping words into
 * short phrases (max ~3.5s / 6 words) and re-basing timestamps to the clip start.
 */
export function buildCaptionCues(
  segments: TranscriptSegment[],
  startSec: number,
  endSec: number,
): CaptionCue[] {
  const words: Word[] = [];
  for (const s of segments) {
    for (const w of s.words) {
      if (w.endSec > startSec && w.startSec < endSec) {
        words.push({
          text: w.text,
          startSec: Math.max(0, w.startSec - startSec),
          endSec: Math.max(0, Math.min(endSec, w.endSec) - startSec),
        });
      }
    }
  }

  const cues: CaptionCue[] = [];
  let group: Word[] = [];
  const flush = () => {
    if (!group.length) return;
    cues.push({
      startSec: group[0].startSec,
      endSec: group[group.length - 1].endSec,
      text: group.map((w) => w.text).join(" "),
      words: group,
    });
    group = [];
  };
  for (const w of words) {
    group.push(w);
    const span = w.endSec - group[0].startSec;
    if (group.length >= 6 || span >= 3.5) flush();
  }
  flush();
  return cues;
}
