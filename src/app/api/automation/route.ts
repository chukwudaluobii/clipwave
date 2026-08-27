import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { errorResponse } from "@/lib/api";

const schema = z.object({
  channelUrl: z.string().url(),
  autoPublish: z.boolean().optional().default(false),
  options: z.record(z.any()).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const automations = await prisma.channelAutomation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ automations });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const automation = await prisma.channelAutomation.create({
      data: {
        userId: user.id,
        channelUrl: body.channelUrl,
        autoPublish: body.autoPublish,
        options: body.options ?? {},
      },
    });
    return NextResponse.json({ automation }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const { id, enabled } = z.object({ id: z.string(), enabled: z.boolean() }).parse(await req.json());
    const existing = await prisma.channelAutomation.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const automation = await prisma.channelAutomation.update({ where: { id }, data: { enabled } });
    return NextResponse.json({ automation });
  } catch (e) {
    return errorResponse(e);
  }
}
