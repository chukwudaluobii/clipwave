import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PostStatus, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { llm } from "@/providers/llm";
import { errorResponse } from "@/lib/api";

const schema = z.object({
  clipId: z.string(),
  platform: z.enum(["TIKTOK", "YOUTUBE", "INSTAGRAM"]),
  scheduledAt: z.string().datetime(),
  socialAccountId: z.string().optional(),
  generateMeta: z.boolean().optional().default(true),
});

/** List scheduled posts for the calendar. */
export async function GET() {
  try {
    const user = await requireUser();
    const posts = await prisma.scheduledPost.findMany({
      where: { clip: { project: { userId: user.id } } },
      include: { clip: { select: { title: true, thumbKey: true, projectId: true } } },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ posts });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Schedule a clip to a platform, auto-generating title/description/hashtags via the LLM. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());

    const clip = await prisma.clip.findFirst({
      where: { id: body.clipId, project: { userId: user.id } },
      include: { project: true },
    });
    if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });

    let caption = clip.title;
    let description = "";
    let hashtags = "";
    if (body.generateMeta) {
      const transcriptText = (clip.captionsJson as any[] | null)
        ?.map((c) => c.text)
        .join(" ") ?? clip.title;
      const meta = await llm().generatePostMeta({
        clipTitle: clip.title,
        transcriptText,
        platform: body.platform,
      });
      caption = meta.title;
      description = meta.description;
      hashtags = meta.hashtags.join(" ");
    }

    const post = await prisma.scheduledPost.create({
      data: {
        clipId: clip.id,
        platform: body.platform as SocialPlatform,
        socialAccountId: body.socialAccountId,
        scheduledAt: new Date(body.scheduledAt),
        status: PostStatus.SCHEDULED,
        caption,
        description,
        hashtags,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
