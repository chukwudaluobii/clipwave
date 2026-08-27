/**
 * Clipwave worker. Consumes BullMQ jobs and runs the processing pipeline.
 * Run with: npm run worker   (dev, watch)  |  npm run worker:start (prod)
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { getConnection, PROCESS_QUEUE, QUEUE_DRIVER, type ProcessJobData } from "../src/lib/queue";
import { processProject } from "../src/pipeline/process";
import { startChannelPoller } from "../src/automation/channel-poller";

if (QUEUE_DRIVER !== "bullmq") {
  console.warn(
    "⚠ QUEUE_DRIVER is not 'bullmq' — jobs run inline inside the web server and this worker is idle.\n" +
      "  Set QUEUE_DRIVER=bullmq (and run Redis) to use this dedicated worker.",
  );
}

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

const worker = new Worker<ProcessJobData>(
  PROCESS_QUEUE,
  async (job) => {
    console.log(`▶ processing project ${job.data.projectId} (attempt ${job.attemptsMade + 1})`);
    await processProject(job.data.projectId);
    console.log(`✓ finished project ${job.data.projectId}`);
  },
  { connection: getConnection(), concurrency },
);

worker.on("failed", (job, err) => {
  console.error(`✗ project ${job?.data.projectId} failed:`, err.message);
});

worker.on("ready", () => console.log(`Clipwave worker ready (concurrency=${concurrency})`));

// Channel automation: 24/7 monitoring loop (stubbed poller).
startChannelPoller();

const shutdown = async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
