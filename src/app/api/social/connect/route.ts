import { NextRequest, NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { publisher } from "@/providers/social";
import { signState } from "@/providers/social/state";
import { env } from "@/config/env";
import { errorResponse } from "@/lib/api";

/** Start the real OAuth flow: redirect the user to the platform's consent screen. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const platform = req.nextUrl.searchParams.get("platform") as SocialPlatform | null;
    if (!platform || !(platform in SocialPlatform)) {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    const provider = publisher(platform);
    if (!provider.isConfigured()) {
      // No fake accounts: tell the user this platform needs credentials.
      return NextResponse.redirect(`${env.appUrl}/dashboard/accounts?error=not_configured&platform=${platform}`);
    }

    const state = signState({ userId: user.id, platform });
    return NextResponse.redirect(provider.authorizeUrl(state));
  } catch (e) {
    return errorResponse(e);
  }
}
