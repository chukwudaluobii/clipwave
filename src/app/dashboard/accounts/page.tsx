import { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { planById } from "@/config/pricing";
import { isConfigured } from "@/providers/social";

const PLATFORMS = [
  { id: "YOUTUBE", name: "YouTube", icon: "▶️", setup: "Google Cloud → OAuth client. Set GOOGLE_CLIENT_ID/SECRET (or YOUTUBE_CLIENT_ID/SECRET)." },
  { id: "TIKTOK", name: "TikTok", icon: "🎵", setup: "TikTok for Developers app. Set TIKTOK_CLIENT_KEY/SECRET." },
  { id: "INSTAGRAM", name: "Instagram", icon: "📸", setup: "Meta app with Instagram Graph. Set FACEBOOK_APP_ID/SECRET." },
] as const;

const ERRORS: Record<string, string> = {
  not_configured: "That platform isn't configured yet — add its API credentials (see setup note).",
  denied: "Connection was cancelled or denied on the provider's screen.",
  state: "Security check failed (expired or invalid). Please try connecting again.",
  exchange: "Couldn't complete the connection with the provider.",
  limit: "You've reached your plan's connected-account limit. Upgrade to connect more.",
  invalid: "Missing authorization code from the provider.",
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string; detail?: string };
}) {
  const user = (await getCurrentUser())!;
  const accounts = await prisma.socialAccount.findMany({ where: { userId: user.id } });
  const plan = planById(user.subscription?.plan ?? "STARTER");
  const limit = plan?.connectedAccounts;

  return (
    <div>
      <h1 className="text-2xl font-bold">Connected accounts</h1>
      <p className="text-sm text-slate-400">
        Connect the platforms you publish to via secure OAuth. Your {plan?.name} plan allows{" "}
        {limit === null ? "unlimited" : limit} account{limit === 1 ? "" : "s"}.
      </p>

      {searchParams.connected && (
        <div className="card mt-4 border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
          Connected {searchParams.connected} successfully. 🎉
        </div>
      )}
      {searchParams.error && (
        <div className="card mt-4 border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-300">
          {ERRORS[searchParams.error] ?? "Something went wrong connecting the account."}
          {searchParams.detail && <span className="block text-amber-400/70">{searchParams.detail}</span>}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const connected = accounts.filter((a) => a.platform === (p.id as SocialPlatform));
          const configured = isConfigured(p.id as SocialPlatform);
          return (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 font-semibold">{p.name}</h3>

              {connected.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {connected.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> {a.handle}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Not connected</p>
              )}

              <div className="mt-auto pt-4">
                {configured ? (
                  <a href={`/api/social/connect?platform=${p.id}`} className="btn-primary w-full py-1.5 text-sm">
                    {connected.length ? "Connect another" : "Connect"}
                  </a>
                ) : (
                  <>
                    <button disabled className="btn-ghost w-full py-1.5 text-sm opacity-60">
                      Setup required
                    </button>
                    <p className="mt-2 text-[11px] leading-snug text-slate-500">{p.setup}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-6 p-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">How connecting works</p>
        <p className="mt-1">
          Each button starts a real OAuth 2.0 flow. Set the app&apos;s redirect URI to{" "}
          <code className="text-slate-300">{`${process.env.APP_URL ?? "http://localhost:3000"}/api/social/callback`}</code>.
          Tokens are stored on your account and used for scheduled publishing. Always follow each
          platform&apos;s Terms of Service.
        </p>
      </div>
    </div>
  );
}
