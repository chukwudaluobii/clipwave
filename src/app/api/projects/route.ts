import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProjectSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { enqueueProject } from "@/lib/queue";
import { errorResponse } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  sourceUrl: z.string().url(),
  rightsConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you have the rights to this content." }),
  }),
  language: z.string().optional(),
  options: z
    .object({
      maxClips: z.number().int().min(1).max(20).optional(),
      minSec: z.number().optional(),
      maxSec: z.number().optional(),
      captionTemplate: z.enum(["bold", "minimal", "karaoke", "neon"]).optional(),
      addHookTitles: z.boolean().optional(),
      targetLanguages: z.array(z.string()).optional(),
      gameOverlayKey: z.string().nullable().optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clips: true } } },
    });
    return NextResponse.json({ projects });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: body.title,
        source: ProjectSource.YOUTUBE,
        sourceUrl: body.sourceUrl,
        rightsConfirmed: body.rightsConfirmed,
        language: body.language ?? "en",
        options: body.options ?? {},
      },
    });

    await enqueueProject(project.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
