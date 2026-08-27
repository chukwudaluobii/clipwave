import type { CropWindow } from "../types";
import type { FaceTracker, ReframeTarget } from "./index";

/**
 * Heuristic auto-crop. Computes the widest crop matching the target aspect ratio, centered
 * horizontally and biased slightly toward the upper third (where talking-head subjects sit).
 * Returns a single static window covering the whole clip.
 *
 * TODO(integration): replace with real face detection. Suggested shape:
 *   1. Sample frames every N ms (ffmpeg -> images, or decode in-process).
 *   2. Run a face detector (MediaPipe / face-api.js / cloud) to get bbox per frame.
 *   3. Smooth bbox centers over time (e.g. EMA) and emit one CropWindow per stable interval.
 *   4. Return windows so render.ts can apply a moving crop (sendcmd / per-segment crop).
 */
export class HeuristicFaceTracker implements FaceTracker {
  async plan(t: ReframeTarget): Promise<CropWindow[]> {
    const targetAR = t.targetWidth / t.targetHeight; // 9/16 ≈ 0.5625
    const sourceAR = t.sourceWidth / t.sourceHeight;

    let cropW: number;
    let cropH: number;
    if (sourceAR > targetAR) {
      // Source is wider than target: crop the sides.
      cropH = t.sourceHeight;
      cropW = Math.round(cropH * targetAR);
    } else {
      // Source is taller/narrower: crop top/bottom.
      cropW = t.sourceWidth;
      cropH = Math.round(cropW / targetAR);
    }

    const x = Math.round((t.sourceWidth - cropW) / 2);
    // Bias upward (~upper third) where faces usually are, clamped to bounds.
    const y = Math.max(0, Math.round((t.sourceHeight - cropH) * 0.33));

    return [
      {
        startSec: 0,
        endSec: t.durationSec,
        x,
        y,
        width: cropW,
        height: cropH,
      },
    ];
  }
}
