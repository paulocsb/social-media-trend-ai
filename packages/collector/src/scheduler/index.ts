import cron from 'node-cron';
import { getPgPool, getTrackedHashtags, getTrackedProfiles } from '@trend/db';
import { enqueueHashtags, enqueueProfiles } from '../queue/worker.js';

async function getActiveCampaigns(): Promise<Array<{ id: string; name: string }>> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM campaigns WHERE active = true ORDER BY created_at ASC`,
  );
  return rows;
}

async function scheduleHashtagCollection() {
  const campaigns = await getActiveCampaigns();
  for (const campaign of campaigns) {
    const rows = await getTrackedHashtags(campaign.id, true);
    const hashtags = rows.map((r) => r.hashtag);
    if (!hashtags.length) { console.log(`[scheduler] Campaign "${campaign.name}": no active hashtags`); continue; }
    console.log(`[scheduler] Campaign "${campaign.name}": enqueueing ${hashtags.length} hashtags`);
    await enqueueHashtags(hashtags, campaign.id).catch(console.error);
  }
}

async function scheduleProfileCollection() {
  const campaigns = await getActiveCampaigns();
  for (const campaign of campaigns) {
    const rows = await getTrackedProfiles(campaign.id, true);
    const handles = rows.map((r) => r.handle);
    if (!handles.length) { console.log(`[scheduler] Campaign "${campaign.name}": no active profiles`); continue; }
    console.log(`[scheduler] Campaign "${campaign.name}": enqueueing ${handles.length} profiles`);
    await enqueueProfiles(handles, campaign.id).catch(console.error);
  }
}

export function startScheduler() {
  cron.schedule('0 7 * * *',  () => scheduleHashtagCollection().catch(console.error));
  cron.schedule('15 7 * * *', () => scheduleProfileCollection().catch(console.error));
  console.log('[scheduler] Cron jobs started (hashtags 07:00, profiles 07:15 daily)');
}
