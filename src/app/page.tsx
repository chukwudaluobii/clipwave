import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { PricingTable } from "@/components/PricingTable";

const FEATURES = [
  ["🤖", "Auto curation", "AI scans your transcript for hooks, emotional peaks, and quotable lines, then turns the best moments into clips automatically."],
  ["🎯", "Face tracking", "Reframes to vertical 9:16 and keeps the speaker centered as they move."],
  ["💬", "Captions + translation", "Word-level animated captions in selectable styles, translatable into 30+ languages while keeping the original audio."],
  ["🪝", "Hook titles & CTAs", "Auto-added title overlays and calls-to-action that boost watch-through."],
  ["🎮", "Game video overlay", "Drop engaging gameplay footage along the bottom of the frame in one click."],
  ["🗣️", "Multi-language audio", "Pick a preferred audio track when the source has several."],
  ["📅", "Schedule & post", "A calendar for TikTok, YouTube Shorts, and Reels with AI-written titles, descriptions, and hashtags."],
  ["🔁", "Channel automation", "Point Clipwave at a channel — it watches 24/7, auto-clips new uploads, and posts hands-off."],
];

const STEPS = [
  ["Paste or upload", "Drop a YouTube URL or upload a video. Confirm you have the rights."],
  ["AI finds the gold", "We transcribe it and score every moment for virality."],
  ["Render & reframe", "Each pick is cut to 9:16, face-tracked, and captioned."],
  ["Schedule & publish", "Queue clips to your accounts with AI-written metadata."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aurora">
      <MarketingNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 text-center md:pt-24">
        <span className="badge bg-white/10 text-brand-200">New · AI moment detection</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Turn long videos into{" "}
          <span className="bg-gradient-to-r from-brand-300 to-purple-400 bg-clip-text text-transparent">
            scroll-stopping shorts
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
          Clipwave finds your most viral moments and turns one long-form video into a week of
          vertical clips — captioned, reframed, and ready to schedule across TikTok, YouTube
          Shorts, and Reels.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signin" className="btn-primary px-6 py-3 text-base">Start clipping free</Link>
          <Link href="/pricing" className="btn-ghost px-6 py-3 text-base">See pricing</Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Only repurpose content you own or are authorized to use. Clipwave reminds you of
          platform ToS &amp; copyright at every step.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-center text-3xl font-bold">Everything you need to go viral</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, title, body]) => (
            <div key={title} className="card p-5">
              <div className="text-2xl">{icon}</div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-center text-3xl font-bold">From upload to published in minutes</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="card p-5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/20 font-bold text-brand-300">
                {i + 1}
              </div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl font-bold">Simple, credit-based pricing</h2>
        <p className="mt-2 text-center text-slate-400">
          Billed yearly. 1 credit ≈ 20 minutes of source video.
        </p>
        <div className="mt-10">
          <PricingTable />
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Clipwave. Original demo branding — not affiliated with any other product.</p>
        <p className="mt-1">Repurpose only content you have the rights to.</p>
        <p className="mt-3">
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
