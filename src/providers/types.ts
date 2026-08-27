// Shared domain types used across providers and the pipeline.

export interface Word {
  text: string;
  startSec: number;
  endSec: number;
}

export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
  words: Word[];
}

export interface Transcript {
  language: string;
  durationSec: number;
  segments: TranscriptSegment[];
}

export interface MomentCandidate {
  startSec: number;
  endSec: number;
  title: string;
  /** 0–100 virality score. */
  score: number;
  reason: string;
}

export interface PostMeta {
  title: string;
  description: string;
  hashtags: string[];
}

/** A crop window (in source pixels) for one time range, used to reframe to 9:16. */
export interface CropWindow {
  startSec: number;
  endSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
