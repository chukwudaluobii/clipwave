"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

function SignInInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("demo@clipwave.app");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-aurora px-5">
      <div className="card w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to start clipping. (Dev mode: any email works and creates an account.)
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            signIn("credentials", { email, callbackUrl: next });
          }}
        >
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue with email"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>
        <button
          className="btn-ghost w-full"
          onClick={() => signIn("google", { callbackUrl: next })}
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-[11px] text-slate-500">
          Google sign-in requires GOOGLE_CLIENT_ID / SECRET in .env.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
