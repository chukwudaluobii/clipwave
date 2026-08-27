const MAP: Record<string, string> = {
  QUEUED: "bg-slate-500/20 text-slate-300",
  INGESTING: "bg-amber-500/20 text-amber-300",
  TRANSCRIBING: "bg-amber-500/20 text-amber-300",
  DETECTING: "bg-amber-500/20 text-amber-300",
  RENDERING: "bg-brand-500/20 text-brand-300",
  READY: "bg-emerald-500/20 text-emerald-300",
  FAILED: "bg-rose-500/20 text-rose-300",
  PENDING: "bg-slate-500/20 text-slate-300",
  DRAFT: "bg-slate-500/20 text-slate-300",
  SCHEDULED: "bg-brand-500/20 text-brand-300",
  PUBLISHED: "bg-emerald-500/20 text-emerald-300",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${MAP[status] ?? "bg-white/10 text-slate-300"}`}>{status.toLowerCase()}</span>;
}
