"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ScheduleDialog } from "@/components/ScheduleDialog";

interface Clip {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  score: number;
  reason?: string;
  status: string;
  captionTemplate: string;
  videoUrl: string | null;
  thumbUrl: string | null;
  translations: Record<string, unknown> | null;
}
interface Project {
  id: string;
  title: string;
  status: string;
  progress: number;
  error?: string;
  durationSec?: number;
  clips: Clip[];
}

const STAGES = ["INGESTING", "TRANSCRIBING", "DETECTING", "RENDERING", "READY"];

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [scheduling, setScheduling] = useState<Clip | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) setProject((await res.json()).project);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      setProject((p) => {
        if (p && (p.status === "READY" || p.status === "FAILED")) return p;
        load();
        return p;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [load]);

  if (!project) return <div className="text-slate-400">Loading…</div>;

  const processing = !["READY", "FAILED"].includes(project.status);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Projects</Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <StatusBadge status={project.status} />
      </div>

      {processing && (
        <div className="card mt-5 p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-medium">Processing your video…</span>
            <span className="text-slate-400">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-purple-500 transition-all" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {STAGES.map((s) => {
              const done = STAGES.indexOf(s) < STAGES.indexOf(project.status);
              const active = s === project.status;
              return (
                <span key={s} className={`badge ${active ? "bg-brand-500 text-white" : done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"}`}>
                  {done ? "✓ " : active ? "● " : ""}{s.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {project.status === "FAILED" && (
        <div className="card mt-5 border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
          Processing failed: {project.error}. Any credits charged were refunded.
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Clips {project.clips.length > 0 && `(${project.clips.length})`}</h2>
      {project.clips.length === 0 && !processing && (
        <p className="mt-2 text-sm text-slate-400">No clips were produced.</p>
      )}

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {project.clips.map((clip) => (
          <div key={clip.id} className="card overflow-hidden">
            <div className="relative aspect-[9/16] bg-black">
              {clip.videoUrl ? (
                <video src={clip.videoUrl} poster={clip.thumbUrl ?? undefined} controls className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-500">
                  {clip.status === "RENDERING" ? "Rendering…" : clip.status}
                </div>
              )}
              <span className="badge absolute left-2 top-2 bg-black/70 text-amber-300">🔥 {Math.round(clip.score)}</span>
            </div>
            <div className="p-3">
              <div className="line-clamp-2 text-sm font-semibold">{clip.title}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {fmt(clip.startSec)}–{fmt(clip.endSec)} · {clip.captionTemplate}
                {clip.translations ? ` · ${Object.keys(clip.translations).length} languages` : ""}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/dashboard/editor/${clip.id}`} className="btn-ghost flex-1 py-1.5 text-xs">Edit</Link>
                <button
                  onClick={() => setScheduling(clip)}
                  disabled={clip.status !== "READY"}
                  className="btn-primary flex-1 py-1.5 text-xs"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {scheduling && (
        <ScheduleDialog clip={scheduling} onClose={() => setScheduling(null)} />
      )}
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
