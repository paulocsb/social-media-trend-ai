import { ok, err } from '@trend/shared';
import type { RawPost } from '@trend/shared';
import type { SourceAdapter, CollectOptions } from './adapter.interface.js';
import { TokenPool } from '../rate-limiter/token-pool.js';

export class GraphApiAdapter implements SourceAdapter {
  readonly name = 'graph-api' as const;
  private tokenPool?: TokenPool;

  constructor(tokens: string[]) {
    if (tokens.length) {
      this.tokenPool = new TokenPool(tokens);
    }
  }

  isAvailable(): boolean {
    if (!this.tokenPool) return false;
    try {
      this.tokenPool.getToken();
      return true;
    } catch {
      return false;
    }
  }

  async collect(options: CollectOptions) {
    try {
      const token = this.tokenPool!.getToken();
      const posts: RawPost[] = [];
      const hashtags = options.hashtags ?? [];

      for (const hashtag of hashtags) {
        const hashtagId = await this.getHashtagId(hashtag, token);
        if (!hashtagId) continue;
        const media = await this.fetchTopMedia(hashtagId, token, options.limit ?? 50);
        posts.push(...media.map((m: Record<string, unknown>) => ({
          id: `graph-api_${m.id as string}`,
          source: 'graph-api' as const,
          raw: m,
          collectedAt: new Date(),
        })));
      }

      return ok(posts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async getHashtagId(hashtag: string, token: string): Promise<string | null> {
    const url = `https://graph.facebook.com/v18.0/ig_hashtag_search?q=${encodeURIComponent(hashtag)}&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ id: string }> };
    return data.data?.[0]?.id ?? null;
  }

  private async fetchTopMedia(hashtagId: string, token: string, limit: number): Promise<Record<string, unknown>[]> {
    const fields = 'id,media_type,like_count,comments_count,timestamp,caption';
    const url = `https://graph.facebook.com/v18.0/${hashtagId}/top_media?fields=${fields}&limit=${limit}&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { data?: Record<string, unknown>[] };
    return data.data ?? [];
  }
}
