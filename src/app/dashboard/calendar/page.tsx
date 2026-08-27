"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

interface Post {
  id: string;
  platform: string;
  caption: string | null;
  scheduledAt: string;
  status: string;
  hashtags: string | null;
  clip: { title: string };
}

const PLATFORM_ICON: Record<string, string> = { TIKTOK: "🎵", YOUTUBE: "▶️", INSTAGRAM: "📸" };

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    fetch("/api/schedule").then((r) => r.json()).then((d) => setPosts(d.posts ?? []));
  }, []);

  const byDay = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const p of posts) {
      const key = new Date(p.scheduledAt).toDateString();
      (map[key] ??= []).push(p);
    }
    return map;
  }, [posts]);

  const days = monthGrid(month);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content calendar</h1>
          <p className="text-sm text-slate-400">Scheduled posts across your connected accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost py-1.5" onClick={() => setMonth(addMonths(month, -1))}>←</button>
          <span className="w-36 text-center font-medium">
            {month.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button className="btn-ghost py-1.5" onClick={() => setMonth(addMonths(month, 1))}>→</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-ink-800 px-2 py-1.5 text-center font-medium text-slate-400">{d}</div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayPosts = byDay[day.toDateString()] ?? [];
          return (
            <div key={day.toISOString()} className={`min-h-24 bg-ink-900 p-1.5 ${inMonth ? "" : "opacity-40"}`}>
              <div className="text-right text-[11px] text-slate-500">{day.getDate()}</div>
              <div className="mt-1 space-y-1">
                {dayPosts.map((p) => (
                  <div key={p.id} className="rounded-md bg-brand-500/20 px-1.5 py-1 text-[11px] text-brand-100">
                    <div className="flex items-center gap-1">
                      <span>{PLATFORM_ICON[p.platform]}</span>
                      <span className="truncate">{p.caption || p.clip.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(p.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Upcoming</h2>
      <div className="mt-3 space-y-2">
        {posts.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled yet. Schedule a clip from a project.</p>}
        {posts.map((p) => (
          <div key={p.id} className="card flex items-center justify-between p-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-lg">{PLATFORM_ICON[p.platform]}</span>
              <div>
                <div className="font-medium">{p.caption || p.clip.title}</div>
                <div className="text-[11px] text-slate-500">{p.hashtags}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{new Date(p.scheduledAt).toLocaleString()}</span>
              <StatusBadge status={p.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function monthGrid(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
