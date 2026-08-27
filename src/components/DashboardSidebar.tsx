"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "./Logo";

const NAV = [
  ["/dashboard", "Projects", "🎬"],
  ["/dashboard/new", "New clip", "✨"],
  ["/dashboard/calendar", "Calendar", "📅"],
  ["/dashboard/accounts", "Accounts", "🔗"],
  ["/dashboard/automation", "Automation", "🔁"],
  ["/dashboard/billing", "Billing", "💳"],
];

export function DashboardSidebar({ credits, plan }: { credits: number; plan: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-ink-800/50 p-4">
      <div className="px-2 py-2">
        <Logo href="/dashboard" />
      </div>

      <div className="card mt-4 p-3">
        <div className="text-xs text-slate-400">Credits</div>
        <div className="text-2xl font-bold text-brand-300">{credits.toLocaleString()}</div>
        <div className="mt-1 text-[11px] text-slate-500">{plan} plan · 1 credit ≈ 20 min</div>
        <Link href="/dashboard/billing" className="btn-ghost mt-3 w-full py-1.5 text-xs">
          Manage plan
        </Link>
      </div>

      <nav className="mt-5 flex-1 space-y-1">
        {NAV.map(([href, label, icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active ? "bg-brand-500/20 text-brand-200" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost mt-4 py-2 text-sm">
        Sign out
      </button>
    </aside>
  );
}
