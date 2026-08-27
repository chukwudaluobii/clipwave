"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PLAN_LIST, type PlanId } from "@/config/pricing";

export function PricingTable() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanId) {
    if (status !== "authenticated") {
      router.push("/signin?next=/pricing");
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_LIST.map((plan) => (
          <div
            key={plan.id}
            className={`card relative flex flex-col p-6 ${
              plan.highlight ? "ring-2 ring-brand-400" : ""
            }`}
          >
            {plan.highlight && (
              <span className="badge absolute -top-3 left-6 bg-brand-500 text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold">${plan.monthlyEq.toFixed(2)}</span>
              <span className="text-sm text-slate-400">/mo</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              ${plan.yearlyPrice.toFixed(2)} billed yearly
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-0.5 text-brand-400">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose(plan.id)}
              disabled={loading === plan.id}
              className={`mt-6 ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
            >
              {loading === plan.id ? "Loading…" : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-center text-sm text-rose-400">{error}</p>}
      <p className="mt-6 text-center text-xs text-slate-500">
        Prices are intentionally low for this demo (~10% of a reference product) and are fully
        editable in <code className="text-slate-400">src/config/pricing.ts</code>. 1 credit ≈ 20
        minutes of source video.
      </p>
    </div>
  );
}
