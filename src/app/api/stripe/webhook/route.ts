import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { stripe, planForPriceId } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/config/pricing";
import { applyLedger } from "@/lib/credits";
import { LedgerReason, Plan, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Stripe webhook: keeps Subscription rows in sync and grants plan credits on renewal.
 * Configure the endpoint at /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const s = stripe();
  if (!s) return NextResponse.json({ error: "Billing disabled" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, sig!, env.stripe.webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncSubscriptionFromStripe(s, session.subscription as string, session.metadata);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(s, sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: SubscriptionStatus.CANCELED, cancelAtPeriodEnd: false },
        });
        break;
      }
      case "invoice.paid": {
        // Grant the plan's credit bucket once per billing period (idempotent by invoice id).
        const invoice = event.data.object as Stripe.Invoice;
        await grantCreditsForInvoice(s, invoice);
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function syncSubscriptionFromStripe(
  s: Stripe,
  subscriptionId: string,
  meta?: Stripe.Metadata | null,
) {
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price.id;
  const plan = (priceId && planForPriceId(priceId)) || (meta?.plan as PlanId) || "STARTER";
  const userId = (sub.metadata?.userId as string) || (meta?.userId as string);

  const customerId = sub.customer as string;
  const where = userId ? { userId } : { stripeCustomerId: customerId };

  await prisma.subscription.upsert({
    where: userId ? { userId } : { stripeCustomerId: customerId },
    update: {
      plan: plan as Plan,
      status: mapStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    create: {
      userId: userId!,
      plan: plan as Plan,
      status: mapStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
  void where;
}

async function grantCreditsForInvoice(s: Stripe, invoice: Stripe.Invoice) {
  const subId = invoice.subscription as string | null;
  if (!subId) return;
  const sub = await s.subscriptions.retrieve(subId);
  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? planForPriceId(priceId) : undefined;
  const userId = sub.metadata?.userId as string | undefined;
  if (!plan || !userId) return;

  const note = `stripe:invoice:${invoice.id}`;
  const exists = await prisma.creditLedger.findFirst({ where: { note } });
  if (exists) return; // idempotent

  await applyLedger({
    userId,
    delta: PLANS[plan].creditsPerYear,
    reason: LedgerReason.PLAN_GRANT,
    note,
  });
}

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active": return SubscriptionStatus.ACTIVE;
    case "trialing": return SubscriptionStatus.TRIALING;
    case "past_due": return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "unpaid": return SubscriptionStatus.CANCELED;
    default: return SubscriptionStatus.INCOMPLETE;
  }
}
