import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ProjectsPage() {
  const user = (await getCurrentUser())!;
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clips: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your projects</h1>
          <p className="text-sm text-slate-400">Long videos you&apos;ve turned into clips.</p>
        </div>
        <Link href="/dashboard/new" className="btn-primary">+ New clip</Link>
      </div>

      {projects.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <div className="text-4xl">🎬</div>
          <h2 className="mt-3 text-lg font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-400">
            Paste a YouTube URL or upload a video to create your first clips.
          </p>
          <Link href="/dashboard/new" className="btn-primary mt-5">Create your first clip</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="card flex items-center justify-between p-4 transition hover:border-white/20"
            >
              <div>
                <div className="font-semibold">{p.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {p.source} · {p._count.clips} clip{p._count.clips === 1 ? "" : "s"} ·{" "}
                  {p.durationSec ? `${Math.round(p.durationSec / 60)} min` : "—"} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.status !== "READY" && p.status !== "FAILED" && (
                  <span className="text-xs text-slate-400">{p.progress}%</span>
                )}
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
