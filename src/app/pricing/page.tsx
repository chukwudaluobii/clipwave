import { MarketingNav } from "@/components/MarketingNav";
import { PricingTable } from "@/components/PricingTable";

export const metadata = { title: "Pricing — Clipwave" };

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-aurora">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-center text-4xl font-bold">Pricing that scales with your channel</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
          Every plan includes AI clipping, captions, scheduling, and API access. Upgrade any
          time — credits and connected-account limits adjust automatically.
        </p>
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>
    </div>
  );
}
