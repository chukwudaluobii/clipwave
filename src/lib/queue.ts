import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/config/env";

/**
 * Queue abstraction with two drivers so the platform can run with ZERO extra infrastructure:
 *
 *  - QUEUE_DRIVER=inline  (default) — no Redis, no separate worker. `enqueueProject` runs the
 *    pipeline in-process (fire-and-forget). Perfect for a single Node server / one container.
 *  - QUEUE_DRIVER=bullmq            — durable Redis-backed queue + separate `npm run worker`
 *    process. Use this to scale rendering horizontally.
 *
 * Redis/BullMQ are only constructed when actually used, so inline mode never opens a socket.
 */
export const PROCESS_QUEUE = "clipwave-process";

export interface ProcessJobData {
  projectId: string;
}

export const QUEUE_DRIVER = (process.env.QUEUE_DRIVER || "inline").toLowerCase();

let _connection: ConnectionOptions | null = null;
export function getConnection(): ConnectionOptions {
  if (!_connection) {
    _connection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    }) as unknown as ConnectionOptions;
  }
  return _connection;
}

let _queue: Queue<ProcessJobData> | null = null;
function getQueue(): Queue<ProcessJobData> {
  if (!_queue) {
    _queue = new Queue<ProcessJobData>(PROCESS_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _queue;
}

export async function enqueueProject(projectId: string) {
  if (QUEUE_DRIVER === "bullmq") {
    return getQueue().add(
      "process-project",
      { projectId },
      { jobId: `project-${projectId}` },
    );
  }

  // Inline driver: run the pipeline in-process without blocking the request. The pipeline
  // (ffmpeg etc.) is imported lazily so it never enters edge/build bundles.
  const { processProject } = await import("@/pipeline/process");
  void processProject(projectId).catch((e) =>
    console.error(`[inline] project ${projectId} failed:`, e),
  );
  return { id: projectId } as const;
}
