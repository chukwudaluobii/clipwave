import { NextRequest, NextResponse } from "next/server";
import { ProjectSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { storage } from "@/providers/storage";
import { enqueueProject } from "@/lib/queue";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
// Allow large video uploads.
export const maxDuration = 300;

/**
 * Direct upload flow: receives a multipart video, stores it, creates an UPLOAD project, and
 * enqueues processing. (For very large files in production, switch to presigned multipart
 * uploads straight to S3 — see StorageProvider — and only POST metadata here.)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();

    const file = form.get("file");
    const title = (form.get("title") as string) || "Untitled upload";
    const rightsConfirmed = form.get("rightsConfirmed") === "true";
    const optionsRaw = form.get("options") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!rightsConfirmed) {
      return NextResponse.json(
        { error: "You must confirm you have the rights to this content." },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        source: ProjectSource.UPLOAD,
        rightsConfirmed,
        options: optionsRaw ? JSON.parse(optionsRaw) : {},
      },
    });

    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const key = `sources/${project.id}/source.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await storage().put(key, buf, file.type || "video/mp4");

    await prisma.project.update({ where: { id: project.id }, data: { sourceKey: key } });
    await enqueueProject(project.id);

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
