import { LedgerReason, Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { applyLedger } from "./credits";

/**
 * Ensure a user is ready to use the product the moment they sign up: a default (Starter)
 * subscription and a one-time signup credit bonus so they can process a video immediately
 * without any seeding or Stripe setup. Idempotent — safe to call on every sign-in.
 */
const SIGNUP_BONUS_CREDITS = Number(process.env.SIGNUP_BONUS_CREDITS ?? 60);

export async function provisionNewUser(userId: string): Promise<void> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return; // already provisioned

  const now = new Date();
  const inAYear = new Date(now.getTime() + 365 * 24 * 3600 * 1000);

  await prisma.subscription.create({
    data: {
      userId,
      plan: Plan.STARTER,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: inAYear,
    },
  });

  if (SIGNUP_BONUS_CREDITS > 0) {
    await applyLedger({
      userId,
      delta: SIGNUP_BONUS_CREDITS,
      reason: LedgerReason.SIGNUP_BONUS,
      note: "Welcome bonus — free credits to try Clipwave",
    });
  }
}
