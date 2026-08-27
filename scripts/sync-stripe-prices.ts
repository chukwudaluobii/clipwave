/**
 * Push the plans defined in src/config/pricing.ts to Stripe as products + yearly prices.
 * Idempotent: it tags products with metadata.clipwave_plan and reuses them.
 *
 * Usage:  STRIPE_SECRET_KEY=sk_test_... npm run stripe:sync
 * Then copy the printed STRIPE_PRICE_* lines into your .env.
 */
import "dotenv/config";
import Stripe from "stripe";
import { PLANS, CURRENCY, type PlanId } from "../src/config/pricing";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Set STRIPE_SECRET_KEY in the environment first.");
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  const out: Record<string, string> = {};

  for (const plan of Object.values(PLANS)) {
    // Find or create the product.
    const existing = await stripe.products.search({
      query: `metadata['clipwave_plan']:'${plan.id}'`,
    });
    const product =
      existing.data[0] ??
      (await stripe.products.create({
        name: `Clipwave ${plan.name}`,
        metadata: { clipwave_plan: plan.id, credits_per_year: String(plan.creditsPerYear) },
      }));

    const unitAmount = Math.round(plan.yearlyPrice * 100);

    // Reuse an existing matching yearly price if present.
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = prices.data.find(
      (p) =>
        p.recurring?.interval === "year" &&
        p.unit_amount === unitAmount &&
        p.currency === CURRENCY,
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: unitAmount,
        recurring: { interval: "year" },
        metadata: { clipwave_plan: plan.id },
      });
    }

    out[plan.stripePriceEnv] = price.id;
    console.log(`${plan.name.padEnd(9)} → ${price.id}  ($${plan.yearlyPrice}/yr)`);
  }

  console.log("\nAdd these to your .env:");
  for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
