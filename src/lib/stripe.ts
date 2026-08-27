import Stripe from "stripe";
import { env } from "@/config/env";
import { PLANS, type PlanId } from "@/config/pricing";

/** Lazily-constructed Stripe client. Returns null when no key is configured (stub mode). */
let _stripe: Stripe | null = null;
export function stripe(): Stripe | null {
  if (!env.stripe.secretKey) return null;
  if (!_stripe) _stripe = new Stripe(env.stripe.secretKey, { apiVersion: "2024-06-20" });
  return _stripe;
}

export function isBillingEnabled() {
  return !!env.stripe.secretKey;
}

/** Map a plan to its configured Stripe price id (set by stripe:sync). */
export function priceIdForPlan(plan: PlanId): string | undefined {
  return process.env[PLANS[plan].stripePriceEnv];
}

/** Reverse lookup: given a Stripe price id, find our plan. */
export function planForPriceId(priceId: string): PlanId | undefined {
  return (Object.keys(PLANS) as PlanId[]).find(
    (p) => process.env[PLANS[p].stripePriceEnv] === priceId,
  );
}
