import Link from "next/link";
import { Logo } from "./Logo";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <Link href="/#features" className="hover:text-white">Features</Link>
          <Link href="/#how" className="hover:text-white">How it works</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/signin" className="text-sm text-slate-300 hover:text-white">Sign in</Link>
          <Link href="/signin" className="btn-primary">Start free</Link>
        </div>
      </div>
    </header>
  );
}
