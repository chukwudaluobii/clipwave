import Link from "next/link";
import { MarketingNav } from "./MarketingNav";

/** Shared layout + typography for legal pages (/terms, /privacy). */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink-900">
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {updated}</p>
        <div className="legal mt-8 space-y-5 text-[15px] leading-relaxed text-slate-300">
          {children}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="hover:text-white">Home</Link>
        </div>
      </article>
    </div>
  );
}

/** Section heading used inside legal pages. */
export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-lg font-semibold text-slate-100">{children}</h2>;
}
