const BASE = import.meta.env.VITE_API_URL ?? '';

// If stored token has legacy sub (not a UUID), discard it so user re-logs in
function isLegacyToken(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const payload = JSON.parse(atob(raw.split('.')[1]));
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !UUID_RE.test(payload.sub ?? '');
  } catch { return false; }
}

const stored = localStorage.getItem('jwt');
if (isLegacyToken(stored)) localStorage.removeItem('jwt');

let token: string | null = localStorage.getItem('jwt');

export function setToken(t: string) {
  token = t;
  localStorage.setItem('jwt', t);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json() as T;
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Request failed');
  return data;
}

export const api = {
  // Campaigns
  listCampaigns: () =>
    request<{ ok: boolean; campaigns: Campaign[] }>('/api/campaigns'),
  createCampaign: (data: { name: string; description?: string; color?: string }) =>
    request<{ ok: boolean; campaign: Campaign }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: { name?: string; description?: string | null; color?: string; active?: boolean }) =>
    request<{ ok: boolean; campaign: Campaign }>(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) =>
    request<{ ok: boolean }>(`/api/campaigns/${id}`, { method: 'DELETE' }),

  // Trends (campaign-scoped)
  getHashtagLeaderboard: (campaignId: string, window = '24h', limit = 20) =>
    request<{ ok: boolean; hashtags: Array<{ hashtag: string; score: number }> }>(
      `/api/trends/hashtags?campaignId=${campaignId}&window=${window}&limit=${limit}`,
    ),
  getPosts: (campaignId: string, window = '24h', limit = 20, verifiedOnly = true) =>
    request<{ ok: boolean; posts: unknown[] }>(`/api/trends/posts?campaignId=${campaignId}&window=${window}&limit=${limit}&verifiedOnly=${verifiedOnly}`),
  getVelocity: (campaignId: string) =>
    request<{ ok: boolean; velocity: Array<{ hashtag: string; velocity: number }> }>(`/api/trends/velocity?campaignId=${campaignId}`),

  // Alerts (campaign-scoped)
  getAlerts: (campaignId: string) =>
    request<{ ok: boolean; alerts: unknown[] }>(`/api/alerts?campaignId=${campaignId}`),
  createAlert: (campaignId: string, hashtag: string, threshold: number) =>
    request('/api/alerts', { method: 'POST', body: JSON.stringify({ campaignId, hashtag, threshold }) }),
  updateAlert: (id: string, data: { threshold?: number; active?: boolean }) =>
    request(`/api/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAlert: (id: string) =>
    request(`/api/alerts/${id}`, { method: 'DELETE' }),

  // Hashtags (campaign-scoped)
  getTrackedHashtags: (campaignId: string) =>
    request<{ ok: boolean; hashtags: Array<{ id: string; hashtag: string; active: boolean; campaignId: string }> }>(`/api/hashtags?campaignId=${campaignId}`),
  addHashtag: (campaignId: string, hashtag: string) =>
    request('/api/hashtags', { method: 'POST', body: JSON.stringify({ campaignId, hashtag }) }),
  updateHashtag: (id: string, data: { hashtag?: string; active?: boolean }) =>
    request(`/api/hashtags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteHashtag: (id: string) =>
    request(`/api/hashtags/${id}`, { method: 'DELETE' }),

  // Jobs
  getJobs: () =>
    request<{ ok: boolean; queues: unknown[] }>('/api/jobs'),
  triggerCollection: (campaignId?: string) =>
    request<{ ok: boolean; message: string }>('/api/jobs/trigger', { method: 'POST', body: JSON.stringify(campaignId ? { campaignId } : {}) }),
  runJob: (queue: string, jobId: string) =>
    request(`/api/jobs/${encodeURIComponent(queue)}/${jobId}/run`, { method: 'POST' }),
  deleteJob: (queue: string, jobId: string) =>
    request(`/api/jobs/${encodeURIComponent(queue)}/${jobId}`, { method: 'DELETE' }),
  clearQueue: (queue: string, status: 'completed' | 'failed' | 'waiting' | 'delayed' | 'all') =>
    request(`/api/jobs/${encodeURIComponent(queue)}?status=${status}`, { method: 'DELETE' }),

  // Profiles (campaign-scoped)
  getProfiles: (campaignId: string) =>
    request<{ ok: boolean; profiles: Array<{ id: string; handle: string; active: boolean; campaignId: string }> }>(`/api/profiles?campaignId=${campaignId}`),
  addProfile: (campaignId: string, handle: string) =>
    request('/api/profiles', { method: 'POST', body: JSON.stringify({ campaignId, handle }) }),
  updateProfile: (id: string, data: { handle?: string; active?: boolean }) =>
    request(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProfile: (id: string) =>
    request(`/api/profiles/${id}`, { method: 'DELETE' }),
  triggerProfileCollection: (campaignId?: string) =>
    request<{ ok: boolean; message: string }>('/api/jobs/trigger/profiles', { method: 'POST', body: JSON.stringify(campaignId ? { campaignId } : {}) }),

  // Events (campaign-scoped)
  getEvents: (campaignId: string, limit = 20, window = 48) =>
    request<{ ok: boolean; events: unknown[] }>(`/api/events?campaignId=${campaignId}&limit=${limit}&window=${window}`),

  // Analysis (campaign-scoped)
  getAnalysisPrompt: (campaignId: string) =>
    request<{ ok: boolean; prompt: string; meta: { postCount: number; eventCount: number; hashtagCount: number } }>(`/api/analysis/prompt?campaignId=${campaignId}`),
  submitAnalysis: (data: {
    campaignId: string
    selectedPostIds: string[]
    mainTopic: string
    reasoning?: string
    suggestedHashtags: string[]
    contentIdeas: string[]
    urgencyLevel: 'high' | 'medium' | 'low'
    contentFormat: 'reel' | 'carousel' | 'image' | 'any'
  }) =>
    request<{ ok: boolean; analysis: unknown }>('/api/analysis', { method: 'POST', body: JSON.stringify(data) }),
  getLatestAnalysis: (campaignId: string) =>
    request<{ ok: boolean; analysis: AIAnalysis | null }>(`/api/analysis/latest?campaignId=${campaignId}`),
  listAnalyses: (campaignId: string) =>
    request<{ ok: boolean; analyses: AIAnalysis[] }>(`/api/analysis?campaignId=${campaignId}`),

  // User
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/user/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
  getMe: () =>
    request<{ ok: boolean; user: { id: string; name: string; email: string | null; createdAt: string; updatedAt: string } }>('/api/user/me'),
  updateMe: (data: { name?: string; email?: string | null }) =>
    request<{ ok: boolean; user: { id: string; name: string; email: string | null } }>('/api/user/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getTokens: () =>
    request<{ ok: boolean; tokens: Array<{ id: string; name: string; lastUsedAt: string | null; createdAt: string }> }>('/api/user/tokens'),
  createToken: (name: string) =>
    request<{ ok: boolean; token: { id: string; name: string; createdAt: string; rawToken: string } }>('/api/user/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
  revokeToken: (id: string) =>
    request<{ ok: boolean }>(`/api/user/tokens/${id}`, { method: 'DELETE' }),

  // Collection runs (campaign-scoped)
  createRun: (campaignId: string, target: 'hashtags' | 'profiles' | 'both') =>
    request<{ ok: boolean; run: CollectionRun }>('/api/runs', { method: 'POST', body: JSON.stringify({ campaignId, target }) }),
  completeRun: (id: string, data: { status: 'completed' | 'failed' | 'partial'; postsFound?: number; eventsFound?: number; topHashtags?: Array<{ hashtag: string; score: number }>; topEvents?: Array<{ topic: string; strategy: string | null }> }) =>
    request<{ ok: boolean; run: CollectionRun }>(`/api/runs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listRuns: (campaignId: string) =>
    request<{ ok: boolean; runs: CollectionRun[] }>(`/api/runs?campaignId=${campaignId}`),
  getRun: (id: string) =>
    request<{ ok: boolean; run: CollectionRun }>(`/api/runs/${id}`),
};

export type Campaign = {
  id: string
  name: string
  description: string | null
  color: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type AIAnalysis = {
  id: string
  createdAt: string
  campaignId: string
  selectedPostIds: string[]
  mainTopic: string
  reasoning: string | null
  suggestedHashtags: string[]
  contentIdeas: string[]
  urgencyLevel: 'high' | 'medium' | 'low'
  contentFormat: 'reel' | 'carousel' | 'image' | 'any'
  contentPrompt: string | null
}

export type CollectionRun = {
  id: string
  campaignId: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'completed' | 'failed' | 'partial'
  target: 'hashtags' | 'profiles' | 'both'
  triggeredBy: string
  postsFound: number | null
  eventsFound: number | null
  topHashtags: Array<{ hashtag: string; score: number }> | null
  topEvents: Array<{ topic: string; strategy: string | null }> | null
  errorMessage: string | null
}
