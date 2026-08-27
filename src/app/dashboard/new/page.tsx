"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "youtube" | "upload";

const TEMPLATES = ["bold", "minimal", "karaoke", "neon"] as const;
const LANGS = ["es", "fr", "de", "pt", "hi", "ja", "ar"];

export default function NewClipPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("youtube");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [maxClips, setMaxClips] = useState(5);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>("bold");
  const [hookTitles, setHookTitles] = useState(true);
  const [langs, setLangs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = {
    maxClips,
    captionTemplate: template,
    addHookTitles: hookTitles,
    targetLanguages: langs,
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rights) return setError("Please confirm you have the rights to this content.");
    setBusy(true);
    try {
      let projectId: string;
      if (mode === "youtube") {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || "YouTube import",
            sourceUrl: url,
            rightsConfirmed: true,
            options,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create project");
        projectId = data.project.id;
      } else {
        if (!file) throw new Error("Choose a video file to upload.");
        const fd = new FormData();
        fd.set("file", file);
        fd.set("title", title || file.name);
        fd.set("rightsConfirmed", "true");
        fd.set("options", JSON.stringify(options));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        projectId = data.project.id;
      }
      router.push(`/dashboard/projects/${projectId}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Create clips</h1>
      <p className="text-sm text-slate-400">
        Paste a YouTube link or upload a video. We&apos;ll find the best moments automatically.
      </p>

      {/* Rights / ToS notice */}
      <div className="card mt-5 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/90">
        ⚠️ Only process content you own or are authorized to repurpose. Respect each platform&apos;s
        Terms of Service and copyright law. You confirm your rights below.
      </div>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <div className="inline-flex rounded-xl border border-white/10 p-1">
          {(["youtube", "upload"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                mode === m ? "bg-brand-500 text-white" : "text-slate-300"
              }`}
            >
              {m === "youtube" ? "YouTube URL" : "Upload file"}
            </button>
          ))}
        </div>

        <div className="card p-5">
          <label className="label">Project title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My podcast episode #12" />

          {mode === "youtube" ? (
            <div className="mt-4">
              <label className="label">YouTube URL</label>
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                required
              />
            </div>
          ) : (
            <div className="mt-4">
              <label className="label">Video file</label>
              <input
                type="file"
                accept="video/*"
                className="input file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1 file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="card grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Number of clips: {maxClips}</label>
            <input type="range" min={1} max={10} value={maxClips} onChange={(e) => setMaxClips(+e.target.value)} className="w-full accent-brand-500" />
          </div>
          <div>
            <label className="label">Caption style</label>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as any)}>
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hookTitles} onChange={(e) => setHookTitles(e.target.checked)} className="accent-brand-500" />
            Add hook title overlays
          </label>
          <div>
            <label className="label">Translate captions into</label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLangs((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]))}
                  className={`badge ${langs.includes(l) ? "bg-brand-500 text-white" : "bg-white/10 text-slate-300"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Original audio is preserved; only captions are translated.</p>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 accent-brand-500" />
          <span>
            I confirm I own this content or am authorized to repurpose it, and I&apos;ll comply
            with the destination platforms&apos; Terms of Service and copyright rules.
          </span>
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button className="btn-primary" disabled={busy}>
          {busy ? "Starting…" : "Generate clips"}
        </button>
      </form>
    </div>
  );
}
