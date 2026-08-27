import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { storage } from "@/providers/storage";
import { errorResponse } from "@/lib/api";

/** Fetch a single clip (with playable URLs) for the caption editor. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const clip = await prisma.clip.findFirst({
      where: { id: params.id, project: { userId: user.id } },
      include: { project: { select: { title: true } } },
    });
    if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      clip: {
        ...clip,
        videoUrl: clip.renderKey ? await storage().url(clip.renderKey) : null,
        thumbUrl: clip.thumbKey ? await storage().url(clip.thumbKey) : null,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  captionTemplate: z.enum(["bold", "minimal", "karaoke", "neon"]).optional(),
  captionsJson: z.any().optional(),
});

/** Update editable clip fields from the caption editor (title, template, edited cues). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const clip = await prisma.clip.findFirst({
      where: { id: params.id, project: { userId: user.id } },
    });
    if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = patchSchema.parse(await req.json());
    const updated = await prisma.clip.update({
      where: { id: clip.id },
      data: {
        title: body.title ?? undefined,
        captionTemplate: body.captionTemplate ?? undefined,
        captionsJson: body.captionsJson ?? undefined,
      },
    });
    // NOTE: changing the template here updates metadata; a re-render is needed to reburn
    // captions. A "re-render" action could re-enqueue just this clip (left as a follow-up).
    return NextResponse.json({ clip: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
