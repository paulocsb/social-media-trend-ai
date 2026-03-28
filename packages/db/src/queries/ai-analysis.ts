import { getPgPool } from '../pg.js';

export type AIAnalysisRow = {
  id: string;
  createdAt: Date;
  campaignId: string;
  selectedPostIds: string[];
  mainTopic: string;
  reasoning: string | null;
  suggestedHashtags: string[];
  contentIdeas: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  contentFormat: 'reel' | 'carousel' | 'image' | 'any';
  contentPrompt: string | null;
};

export type InsertAIAnalysis = Omit<AIAnalysisRow, 'id' | 'createdAt'>;

const SELECT = `
  id, created_at as "createdAt", campaign_id as "campaignId",
  selected_post_ids as "selectedPostIds", main_topic as "mainTopic", reasoning,
  suggested_hashtags as "suggestedHashtags", content_ideas as "contentIdeas",
  urgency_level as "urgencyLevel", content_format as "contentFormat", content_prompt as "contentPrompt"
`;

export async function insertAIAnalysis(data: InsertAIAnalysis): Promise<AIAnalysisRow> {
  const pool = getPgPool();
  const { rows } = await pool.query<AIAnalysisRow>(
    `INSERT INTO ai_analyses
       (campaign_id, selected_post_ids, main_topic, reasoning, suggested_hashtags, content_ideas, urgency_level, content_format, content_prompt)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING ${SELECT}`,
    [
      data.campaignId, data.selectedPostIds, data.mainTopic, data.reasoning ?? null,
      data.suggestedHashtags, data.contentIdeas, data.urgencyLevel, data.contentFormat, data.contentPrompt ?? null,
    ],
  );
  return rows[0];
}

export async function getLatestAIAnalysis(campaignId: string): Promise<AIAnalysisRow | null> {
  const pool = getPgPool();
  const { rows } = await pool.query<AIAnalysisRow>(
    `SELECT ${SELECT} FROM ai_analyses WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [campaignId],
  );
  return rows[0] ?? null;
}

export async function listAIAnalyses(campaignId: string, limit = 10): Promise<AIAnalysisRow[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<AIAnalysisRow>(
    `SELECT ${SELECT} FROM ai_analyses WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [campaignId, limit],
  );
  return rows;
}
