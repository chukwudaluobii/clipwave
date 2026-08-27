import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isBillingEnabled, priceIdForPlan, stripe } from "@/lib/stripe";
import { env } from "@/config/env";
import { errorResponse } from "@/lib/api";

const schema = z.object({ plan: z.enum(["STARTER", "PLUS", "BUSINESS", "SCALE"]) });

/** Create a Stripe Checkout session (subscription mode) for the selected plan. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { plan } = schema.parse(await req.json());

    if (!isBillingEnabled()) {
      return NextResponse.json(
        { error: "Billing is not configured. Set STRIPE_SECRET_KEY to enable checkout." },
        { status: 503 },
      );
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price for ${plan}. Run \`npm run stripe:sync\` and set STRIPE_PRICE_${plan}.` },
        { status: 503 },
      );
    }

    const s = stripe()!;
    // Reuse or create a Stripe customer for this user.
    let customerId = user.subscription?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await s.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: customerId },
        create: { userId: user.id, stripeCustomerId: customerId },
      });
    }

    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      success_url: `${env.appUrl}/dashboard/billing?status=success`,
      cancel_url: `${env.appUrl}/pricing?status=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}
