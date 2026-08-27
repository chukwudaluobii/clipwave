"use client";

import { useEffect, useState } from "react";

interface Automation {
  id: string;
  channelUrl: string;
  enabled: boolean;
  autoPublish: boolean;
  lastCheckedAt: string | null;
}

export default function AutomationPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [url, setUrl] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/automation").then((r) => r.json()).then((d) => setItems(d.automations ?? []));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: url, autoPublish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setUrl("");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Channel automation 🔁</h1>
      <p className="text-sm text-slate-400">
        Point Clipwave at a YouTube channel. It monitors 24/7, auto-clips new uploads, and can
        auto-post hands-off.
      </p>

      <div className="card mt-4 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/90">
        Only automate channels you own or are authorized to repurpose. The 24/7 poller is wired up
        but the YouTube “new upload” fetch is stubbed — see{" "}
        <code>src/automation/channel-poller.ts</code>.
      </div>

      <form onSubmit={add} className="card mt-6 space-y-4 p-5">
        <div>
          <label className="label">YouTube channel URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/@yourchannel" required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} className="accent-brand-500" />
          Auto-publish clips (otherwise they wait as drafts)
        </label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add automation"}</button>
      </form>

      <div className="mt-6 space-y-3">
        {items.map((a) => (
          <div key={a.id} className="card flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{a.channelUrl}</div>
              <div className="text-[11px] text-slate-500">
                {a.autoPublish ? "Auto-publish on" : "Drafts only"} ·{" "}
                {a.lastCheckedAt ? `Last checked ${new Date(a.lastCheckedAt).toLocaleString()}` : "Not checked yet"}
              </div>
            </div>
            <button onClick={() => toggle(a.id, !a.enabled)} className={`badge ${a.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
              {a.enabled ? "Enabled" : "Paused"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
