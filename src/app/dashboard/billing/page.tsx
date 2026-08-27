import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getBalance } from "@/lib/credits";
import { planById } from "@/config/pricing";
import { isBillingEnabled } from "@/lib/stripe";
import { PricingTable } from "@/components/PricingTable";

const REASON_LABEL: Record<string, string> = {
  PLAN_GRANT: "Plan credits",
  SIGNUP_BONUS: "Signup bonus",
  JOB_DEBIT: "Processing",
  JOB_REFUND: "Refund",
  MANUAL_ADJUST: "Adjustment",
};

export default async function BillingPage() {
  const user = (await getCurrentUser())!;
  const balance = await getBalance(user.id);
  const plan = planById(user.subscription?.plan ?? "STARTER");
  const ledger = await prisma.creditLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing &amp; credits</h1>

      {!isBillingEnabled() && (
        <div className="card mt-4 border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-300">
          Stripe is not configured (stub mode). Set <code>STRIPE_SECRET_KEY</code> and run{" "}
          <code>npm run stripe:sync</code> to enable real checkout. Plan changes below will still
          create Checkout sessions once configured.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs text-slate-400">Current plan</div>
          <div className="mt-1 text-2xl font-bold">{plan?.name}</div>
          <div className="text-xs text-slate-500">${plan?.yearlyPrice.toFixed(2)}/yr</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-400">Credit balance</div>
          <div className="mt-1 text-2xl font-bold text-brand-300">{balance.toLocaleString()}</div>
          <div className="text-xs text-slate-500">1 credit ≈ 20 min of source</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-400">Status</div>
          <div className="mt-1 text-2xl font-bold capitalize">
            {(user.subscription?.status ?? "active").toLowerCase()}
          </div>
          <div className="text-xs text-slate-500">
            Renews {user.subscription?.currentPeriodEnd
              ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString()
              : "—"}
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Change plan</h2>
      <p className="text-sm text-slate-400">Prices are editable in <code>src/config/pricing.ts</code>.</p>
      <div className="mt-5">
        <PricingTable />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Credit history</h2>
      <div className="card mt-3 divide-y divide-white/5">
        {ledger.length === 0 && <div className="p-4 text-sm text-slate-400">No activity yet.</div>}
        {ledger.map((row) => (
          <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{REASON_LABEL[row.reason] ?? row.reason}</div>
              <div className="text-[11px] text-slate-500">
                {row.note} · {new Date(row.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={row.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {row.delta >= 0 ? "+" : ""}{row.delta}
              </span>
              <span className="w-16 text-right text-slate-400">{row.balanceAfter}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
