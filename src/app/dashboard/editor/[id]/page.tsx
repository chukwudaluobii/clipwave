"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TEMPLATES = ["bold", "minimal", "karaoke", "neon"] as const;

interface Cue { text: string; startSec: number; endSec: number }
interface Clip {
  id: string;
  title: string;
  captionTemplate: string;
  videoUrl: string | null;
  thumbUrl: string | null;
  captionsJson: Cue[] | null;
  translations: Record<string, Cue[]> | null;
  projectId: string;
}

export default function EditorPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [clip, setClip] = useState<Clip | null>(null);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<string>("bold");
  const [lang, setLang] = useState<string>("original");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/clips/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setClip(d.clip);
        setTitle(d.clip.title);
        setTemplate(d.clip.captionTemplate);
      });
  }, [id]);

  async function save() {
    setSaved(false);
    await fetch(`/api/clips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, captionTemplate: template }),
    });
    setSaved(true);
  }

  if (!clip) return <div className="text-slate-400">Loading…</div>;

  const cues: Cue[] =
    lang === "original" ? clip.captionsJson ?? [] : clip.translations?.[lang] ?? [];

  return (
    <div>
      <Link href={`/dashboard/projects/${clip.projectId}`} className="text-sm text-slate-400 hover:text-white">
        ← Back to project
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Caption editor</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="card overflow-hidden">
          <div className="aspect-[9/16] bg-black">
            {clip.videoUrl && (
              <video src={clip.videoUrl} poster={clip.thumbUrl ?? undefined} controls className="h-full w-full object-contain" />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <label className="label">Clip title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

            <label className="label mt-4">Caption template</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`badge ${template === t ? "bg-brand-500 text-white" : "bg-white/10 text-slate-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Changing the template updates metadata. Re-render to re-burn captions with the new style.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={save} className="btn-primary">Save</button>
              {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Captions</h3>
              <select className="input w-auto py-1.5 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="original">Original</option>
                {Object.keys(clip.translations ?? {}).map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-sm">
              {cues.length === 0 && <p className="text-slate-500">No caption cues.</p>}
              {cues.map((c, i) => (
                <div key={i} className="flex gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="shrink-0 font-mono text-[11px] text-slate-500">{c.startSec.toFixed(1)}s</span>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Audio stays in the original language — only captions are translated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
