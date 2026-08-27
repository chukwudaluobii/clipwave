import { LedgerReason, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Credit accounting. Balance is the SUM of all CreditLedger.delta rows — never a mutable
 * counter — so every change is auditable. All mutations go through `applyLedger`, which is
 * transactional and computes `balanceAfter` atomically to avoid races.
 */

export async function getBalance(userId: string): Promise<number> {
  const agg = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

interface ApplyLedgerArgs {
  userId: string;
  delta: number;
  reason: LedgerReason;
  note?: string;
  projectId?: string;
  /** When true, reject debits that would push balance below zero. */
  requireSufficient?: boolean;
  tx?: Prisma.TransactionClient;
}

export async function applyLedger(args: ApplyLedgerArgs) {
  const run = async (db: Prisma.TransactionClient) => {
    const agg = await db.creditLedger.aggregate({
      where: { userId: args.userId },
      _sum: { delta: true },
    });
    const current = agg._sum.delta ?? 0;
    const next = current + args.delta;

    if (args.requireSufficient && args.delta < 0 && next < 0) {
      throw new InsufficientCreditsError(current, -args.delta);
    }

    return db.creditLedger.create({
      data: {
        userId: args.userId,
        delta: args.delta,
        reason: args.reason,
        balanceAfter: next,
        note: args.note,
        projectId: args.projectId,
      },
    });
  };

  return args.tx ? run(args.tx) : prisma.$transaction(run);
}

/** Grant a plan's yearly credit bucket. Idempotent per note key if provided. */
export async function grantPlanCredits(
  userId: string,
  credits: number,
  note: string,
) {
  return applyLedger({
    userId,
    delta: credits,
    reason: LedgerReason.PLAN_GRANT,
    note,
  });
}

export class InsufficientCreditsError extends Error {
  constructor(
    public balance: number,
    public needed: number,
  ) {
    super(`Insufficient credits: have ${balance}, need ${needed}.`);
    this.name = "InsufficientCreditsError";
  }
}
