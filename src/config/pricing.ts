/**
 * Clipwave pricing — EDIT THESE FREELY.
 *
 * Prices are intentionally low (~10% of a reference product). They are the single source of
 * truth for both the UI and Stripe: `npm run stripe:sync` reads this file to create Stripe
 * products/prices and prints the price ids for your .env.
 *
 * Billing is yearly. `monthlyEq` is shown in the UI as the "/mo" figure but customers are
 * charged `yearlyPrice` once per year.
 *
 * 1 credit ≈ 20 minutes of source video processed.
 */

export type PlanId = "STARTER" | "PLUS" | "BUSINESS" | "SCALE";

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Display "/mo" figure (yearly / 12). */
  monthlyEq: number;
  /** Amount actually charged per year, in dollars. */
  yearlyPrice: number;
  /** Credits granted per year. 1 credit ≈ 20 min of source video. */
  creditsPerYear: number;
  /** Number of connectable social accounts. null = unlimited. */
  connectedAccounts: number | null;
  highlight?: boolean;
  features: string[];
  /** Filled from env at runtime; price id created by stripe:sync. */
  stripePriceEnv: string;
}

export const CURRENCY = "usd";
export const MINUTES_PER_CREDIT = 20;

export const PLANS: Record<PlanId, PlanConfig> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    monthlyEq: 5.6,
    yearlyPrice: 67.2,
    creditsPerYear: 360,
    connectedAccounts: 1,
    features: [
      "360 credits / year (~120 hrs of source)",
      "1 connected account",
      "AI auto-clipping & captions",
      "Scheduling calendar",
      "API access",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  PLUS: {
    id: "PLUS",
    name: "Plus",
    monthlyEq: 11.2,
    yearlyPrice: 134.4,
    creditsPerYear: 840,
    connectedAccounts: 3,
    highlight: true,
    features: [
      "840 credits / year (~280 hrs of source)",
      "3 connected accounts",
      "Everything in Starter",
      "Caption translation (30+ languages)",
      "Hook titles & game-video overlay",
    ],
    stripePriceEnv: "STRIPE_PRICE_PLUS",
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    monthlyEq: 20.4,
    yearlyPrice: 244.8,
    creditsPerYear: 1800,
    connectedAccounts: null,
    features: [
      "1,800 credits / year (~600 hrs of source)",
      "Unlimited connected accounts",
      "Everything in Plus",
      "Channel automation (24/7 monitoring)",
      "Priority rendering",
    ],
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    monthlyEq: 40.0,
    yearlyPrice: 480.0,
    creditsPerYear: 2600,
    connectedAccounts: null,
    features: [
      "2,600 credits / year (~865 hrs of source)",
      "Unlimited connected accounts",
      "Everything in Business",
      "Multiple channel automations",
      "Dedicated support",
    ],
    stripePriceEnv: "STRIPE_PRICE_SCALE",
  },
};

export const PLAN_LIST = Object.values(PLANS);

export function planById(id: string): PlanConfig | undefined {
  return PLANS[id as PlanId];
}

/** Credits needed to process `minutes` of source video. Always ≥ 1. */
export function creditsForMinutes(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / MINUTES_PER_CREDIT));
}
