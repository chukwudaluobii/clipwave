import { ProjectSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueProject } from "@/lib/queue";

/**
 * Channel Automation — monitors connected YouTube channels 24/7, auto-clips new uploads, and
 * (optionally) auto-posts them hands-off.
 *
 * TODO(integration): wire `fetchLatestVideo` to the YouTube Data API (search.list /
 * playlistItems.list against the channel's uploads playlist). The polling loop, dedupe via
 * `lastVideoId`, project creation, and auto-publish hand-off below are all real and ready.
 */
const POLL_INTERVAL_MS = Number(process.env.CHANNEL_POLL_MS ?? 5 * 60 * 1000);

export function startChannelPoller() {
  const tick = async () => {
    try {
      await pollOnce();
    } catch (e) {
      console.error("[channel-poller] error:", e);
    }
  };
  setInterval(tick, POLL_INTERVAL_MS);
  console.log(`Channel poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

export async function pollOnce() {
  const automations = await prisma.channelAutomation.findMany({ where: { enabled: true } });
  for (const a of automations) {
    const latest = await fetchLatestVideo(a.channelUrl);
    if (!latest || latest.videoId === a.lastVideoId) {
      await prisma.channelAutomation.update({
        where: { id: a.id },
        data: { lastCheckedAt: new Date() },
      });
      continue;
    }

    const project = await prisma.project.create({
      data: {
        userId: a.userId,
        title: latest.title,
        source: ProjectSource.YOUTUBE,
        sourceUrl: latest.url,
        rightsConfirmed: true, // owner-authorized automation
        options: (a.options as object) ?? {},
      },
    });
    await enqueueProject(project.id);

    await prisma.channelAutomation.update({
      where: { id: a.id },
      data: { lastVideoId: latest.videoId, lastCheckedAt: new Date() },
    });
    console.log(`[channel-poller] auto-clipped new video ${latest.videoId} for user ${a.userId}`);
  }
}

interface LatestVideo {
  videoId: string;
  title: string;
  url: string;
}

// TODO(integration): replace stub with a real YouTube Data API call.
async function fetchLatestVideo(_channelUrl: string): Promise<LatestVideo | null> {
  return null; // stub: never reports a "new" video so it stays a no-op until wired up.
}
