import { NextRequest, NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { publisher } from "@/providers/social";
import { verifyState } from "@/providers/social/state";
import { planById } from "@/config/pricing";
import { env } from "@/config/env";
import { errorResponse } from "@/lib/api";

/**
 * Real OAuth callback: verifies the signed state (CSRF), exchanges the code for tokens,
 * loads the account identity from the platform API, enforces the plan's account limit, and
 * stores the connected account with its real tokens.
 */
export async function GET(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(`${env.appUrl}/dashboard/accounts?${q}`);
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;

    // The provider may return an error (user denied, etc.).
    const oauthError = sp.get("error");
    if (oauthError) return back(`error=denied&detail=${encodeURIComponent(oauthError)}`);

    const code = sp.get("code");
    const state = sp.get("state");
    if (!code || !state) return back("error=invalid");

    // Verify state signature + that it belongs to this user.
    let parsed;
    try {
      parsed = verifyState(state);
    } catch {
      return back("error=state");
    }
    if (parsed.userId !== user.id) return back("error=state");
    const platform = parsed.platform as SocialPlatform;

    // Enforce the plan's connected-account limit.
    const plan = planById(user.subscription?.plan ?? "STARTER");
    const limit = plan?.connectedAccounts ?? null;
    if (limit !== null) {
      const count = await prisma.socialAccount.count({ where: { userId: user.id } });
      if (count >= limit) return back("error=limit");
    }

    // Real token exchange + identity.
    const provider = publisher(platform);
    const info = await provider.connect(code);

    await prisma.socialAccount.upsert({
      where: { userId_platform_handle: { userId: user.id, platform, handle: info.handle } },
      update: {
        accessToken: info.accessToken,
        refreshToken: info.refreshToken,
        expiresAt: info.expiresAt,
        externalId: info.externalId,
        status: "connected",
      },
      create: {
        userId: user.id,
        platform,
        handle: info.handle,
        externalId: info.externalId,
        accessToken: info.accessToken,
        refreshToken: info.refreshToken,
        expiresAt: info.expiresAt,
      },
    });

    return back(`connected=${platform}`);
  } catch (e) {
    console.error("[social callback]", e);
    return back(`error=exchange&detail=${encodeURIComponent(String((e as Error).message).slice(0, 120))}`);
  }
}
