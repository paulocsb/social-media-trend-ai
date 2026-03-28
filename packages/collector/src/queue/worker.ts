import { hashtagQueue, profileQueue, JOB_DEFAULTS } from './index.js';

export function startWorkers(
  collectHashtag: (hashtags: string[], campaignId: string) => Promise<void>,
  collectProfile: (handles: string[], campaignId: string) => Promise<void>,
) {
  hashtagQueue.process(async (job) => {
    await collectHashtag(job.data.hashtags as string[], job.data.campaignId as string);
  });

  profileQueue.process(async (job) => {
    await collectProfile(job.data.handles as string[], job.data.campaignId as string);
  });

  console.log('[worker] Bull workers started');
}

export async function enqueueHashtags(hashtags: string[], campaignId: string) {
  await hashtagQueue.add({ hashtags, campaignId }, JOB_DEFAULTS);
}

export async function enqueueProfiles(handles: string[], campaignId: string) {
  await profileQueue.add({ handles, campaignId }, JOB_DEFAULTS);
}
