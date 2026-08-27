import "dotenv/config";
import {
  PrismaClient,
  Plan,
  SubscriptionStatus,
  SocialPlatform,
  LedgerReason,
} from "@prisma/client";
import { PLANS } from "../src/config/pricing";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@clipwave.app";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo Creator", emailVerified: new Date() },
  });

  // Subscription on the Plus plan.
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan: Plan.PLUS, status: SubscriptionStatus.ACTIVE },
    create: {
      userId: user.id,
      plan: Plan.PLUS,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
  });

  // Grant the plan's yearly credits once (idempotent via note key).
  const grantNote = "seed:PLUS:grant";
  const existing = await prisma.creditLedger.findFirst({
    where: { userId: user.id, note: grantNote },
  });
  if (!existing) {
    await prisma.creditLedger.create({
      data: {
        userId: user.id,
        delta: PLANS.PLUS.creditsPerYear,
        reason: LedgerReason.PLAN_GRANT,
        balanceAfter: PLANS.PLUS.creditsPerYear,
        note: grantNote,
      },
    });
  }

  // Social accounts are connected by the user via real OAuth (dashboard → Accounts), so we
  // no longer seed a fake demo account here.

  console.log(`✓ Seeded demo user: ${email}`);
  console.log(`  Plan: PLUS · Credits: ${PLANS.PLUS.creditsPerYear}`);
  console.log(`  Sign in at http://localhost:3000/signin with this email (dev credentials login).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
