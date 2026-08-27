import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: user.id },
      select: { id: true, platform: true, handle: true, status: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ accounts });
  } catch (e) {
    return errorResponse(e);
  }
}
