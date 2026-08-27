import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { storage } from "@/providers/storage";
import { errorResponse } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
      include: { clips: { orderBy: { score: "desc" } } },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Attach playable URLs for ready clips.
    const clips = await Promise.all(
      project.clips.map(async (c) => ({
        ...c,
        videoUrl: c.renderKey ? await storage().url(c.renderKey) : null,
        thumbUrl: c.thumbKey ? await storage().url(c.thumbKey) : null,
      })),
    );

    return NextResponse.json({ project: { ...project, clips } });
  } catch (e) {
    return errorResponse(e);
  }
}
