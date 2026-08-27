import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 text-white shadow-lg">
        {/* stylized wave mark */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 14c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-7 5-7 2.5 4 5 4"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-lg">Clipwave</span>
    </Link>
  );
}
