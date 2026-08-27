import type { CropWindow } from "../types";
import { HeuristicFaceTracker } from "./heuristic";

export interface ReframeTarget {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  durationSec: number;
}

export interface FaceTracker {
  /**
   * Produce a sequence of crop windows (in source pixels) that keep the subject framed when
   * reframing the source to the target aspect ratio.
   *
   * NOTE: The shipped implementation is a heuristic (center / rule-of-thirds) crop. To wire up
   * real face tracking, implement this interface against MediaPipe Face Detection, face-api.js,
   * or a cloud vision API and return per-interval windows. See TODO(integration) in heuristic.ts.
   */
  plan(target: ReframeTarget): Promise<CropWindow[]>;
}

let _ft: FaceTracker | null = null;

export function faceTracker(): FaceTracker {
  if (!_ft) _ft = new HeuristicFaceTracker();
  return _ft;
}
