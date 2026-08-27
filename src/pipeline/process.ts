import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  ClipStatus,
  LedgerReason,
  ProjectStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyLedger, InsufficientCreditsError } from "@/lib/credits";
import { storage } from "@/providers/storage";
import { transcription } from "@/providers/transcription";
import { llm } from "@/providers/llm";
import type { Transcript } from "@/providers/types";
import { creditsForMinutes } from "@/config/pricing";
import { ingest } from "./ingest";
import { renderClip, renderThumbnail } from "./render";
import { buildCaptionCues, type CaptionTemplate } from "./captions";

interface ProjectOptions {
  maxClips?: number;
  minSec?: number;
  maxSec?: number;
  captionTemplate?: CaptionTemplate;
  addHookTitles?: boolean;
  gameOverlayKey?: string | null;
  targetLanguages?: string[];
}

type ProgressFn = (status: ProjectStatus, progress: number) => Promise<void>;

/**
 * Full processing pipeline for one project: ingest → transcribe → detect → render.
 * Credits are debited after duration is known and refunded if the job fails.
 */
export async function processProject(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} not found`);

  const options = (project.options ?? {}) as ProjectOptions;

  const setProgress: ProgressFn = async (status, progress) => {
    await prisma.project.update({ where: { id: projectId }, data: { status, progress } });
  };

  let debited = 0;
  try {
    // ── 1. Ingest ──────────────────────────────────────────────
    await setProgress(ProjectStatus.INGESTING, 5);
    const { localPath, sourceKey, durationSec } = await ingest(project);

    // ── Credit debit (after we know the real duration) ─────────
    const cost = creditsForMinutes(durationSec / 60);
    try {
      await applyLedger({
        userId: project.userId,
        delta: -cost,
        reason: LedgerReason.JOB_DEBIT,
        note: `Processing "${project.title}" (${(durationSec / 60).toFixed(1)} min)`,
        projectId,
        requireSufficient: true,
      });
      debited = cost;
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        throw new Error(
          `Not enough credits: need ${e.needed}, have ${e.balance}. Upgrade your plan to process this video.`,
        );
      }
      throw e;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { sourceKey, durationSec: Math.round(durationSec), creditsCharged: cost },
    });

    // ── 2. Transcribe ──────────────────────────────────────────
    await setProgress(ProjectStatus.TRANSCRIBING, 25);
    const transcript: Transcript = await transcription().transcribe(localPath, {
      language: project.language ?? undefined,
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { transcript: transcript as any },
    });

    // ── 3. Detect moments ──────────────────────────────────────
    await setProgress(ProjectStatus.DETECTING, 40);
    const candidates = await llm().detectMoments(transcript, {
      maxClips: options.maxClips ?? 5,
      minSec: options.minSec ?? 15,
      maxSec: options.maxSec ?? 45,
    });

    if (!candidates.length) throw new Error("No viral moments detected in this video.");

    const clips = await Promise.all(
      candidates.map((c) =>
        prisma.clip.create({
          data: {
            projectId,
            title: c.title,
            startSec: c.startSec,
            endSec: c.endSec,
            score: c.score,
            reason: c.reason,
            captionTemplate: options.captionTemplate ?? "bold",
            status: ClipStatus.PENDING,
          },
        }),
      ),
    );

    // ── 4. Render each clip ────────────────────────────────────
    await setProgress(ProjectStatus.RENDERING, 55);

    // Optional bottom gameplay overlay, fetched once.
    let gameOverlayPath: string | undefined;
    if (options.gameOverlayKey) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-game-"));
      gameOverlayPath = path.join(tmp, "game.mp4");
      await storage().getFile(options.gameOverlayKey, gameOverlayPath);
    }

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      await prisma.clip.update({
        where: { id: clip.id },
        data: { status: ClipStatus.RENDERING },
      });

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "clipwave-clip-"));
      const outPath = path.join(workDir, "clip.mp4");
      const thumbPath = path.join(workDir, "thumb.jpg");

      try {
        await renderClip({
          sourcePath: localPath,
          startSec: clip.startSec,
          endSec: clip.endSec,
          segments: transcript.segments,
          outPath,
          captionTemplate: clip.captionTemplate as CaptionTemplate,
          hookTitle: options.addHookTitles ? clip.title : undefined,
          gameOverlayPath,
        });
        await renderThumbnail(localPath, clip.startSec + 0.5, thumbPath);

        const renderKey = `clips/${projectId}/${clip.id}.mp4`;
        const thumbKey = `clips/${projectId}/${clip.id}.jpg`;
        await storage().putFile(renderKey, outPath, "video/mp4");
        await storage().putFile(thumbKey, thumbPath, "image/jpeg");

        // Caption cues persisted so the editor can tweak/translate without re-render.
        const cues = buildCaptionCues(transcript.segments, clip.startSec, clip.endSec);

        // Optional translations of caption text (audio stays original).
        let translations: Record<string, unknown> | undefined;
        if (options.targetLanguages?.length) {
          translations = {};
          const allWords = cues.flatMap((c) => c.words);
          for (const lang of options.targetLanguages) {
            translations[lang] = await llm().translateCaptions(allWords, lang);
          }
        }

        await prisma.clip.update({
          where: { id: clip.id },
          data: {
            status: ClipStatus.READY,
            renderKey,
            thumbKey,
            captionsJson: cues as any,
            translations: translations as any,
          },
        });
      } catch (e: any) {
        await prisma.clip.update({
          where: { id: clip.id },
          data: { status: ClipStatus.FAILED, error: String(e?.message ?? e) },
        });
      } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }

      await setProgress(
        ProjectStatus.RENDERING,
        55 + Math.round(((i + 1) / clips.length) * 40),
      );
    }

    await setProgress(ProjectStatus.READY, 100);
    // Best-effort: clean up the ingested temp source.
    await fs.rm(path.dirname(localPath), { recursive: true, force: true }).catch(() => {});
    if (gameOverlayPath)
      await fs.rm(path.dirname(gameOverlayPath), { recursive: true, force: true }).catch(() => {});
  } catch (err: any) {
    // Refund credits on failure so users aren't charged for broken jobs.
    if (debited > 0) {
      await applyLedger({
        userId: project.userId,
        delta: debited,
        reason: LedgerReason.JOB_REFUND,
        note: `Refund for failed project "${project.title}"`,
        projectId,
      }).catch(() => {});
    }
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.FAILED, error: String(err?.message ?? err) },
    });
    throw err;
  }
}
