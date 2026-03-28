import { ok, err } from '@trend/shared';
import type { RawPost } from '@trend/shared';
import type { SourceAdapter, CollectOptions } from './adapter.interface.js';

export class ApifyProfileAdapter implements SourceAdapter {
  readonly name = 'apify' as const;

  constructor(private readonly apiToken: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiToken);
  }

  async collect(options: CollectOptions) {
    try {
      const usernames = (options.handles ?? []).map((h) => h.replace('@', ''));
      if (!usernames.length) return ok([] as RawPost[]);

      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames, resultsLimit: options.limit ?? 20 }),
          signal: AbortSignal.timeout(290_000),
        },
      );

      const text = await res.text();
      if (!res.ok) return err(new Error(`Apify profile error ${res.status}: ${text.slice(0, 200)}`));
      if (!text.trim()) return ok([] as RawPost[]);

      const data = JSON.parse(text) as Array<Record<string, unknown>>;

      const posts: RawPost[] = data.flatMap((item) => {
        // The scraper may return profile-level objects with nested posts array
        const nestedPosts = (item.latestPosts ?? item.posts ?? item.edges) as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(nestedPosts) && nestedPosts.length > 0) {
          const handle = (item.username ?? item.handle) as string | undefined;
          return nestedPosts.map((post) => ({
            id: `apify_profile_${handle ?? 'unknown'}_${post.id as string ?? post.shortCode as string ?? Math.random()}`,
            source: 'apify' as const,
            raw: { ownerUsername: handle, ...post },
            collectedAt: new Date(),
          }));
        }

        // Flat post object — inject ownerUsername from whichever field is available
        const handle = (
          item.ownerUsername ?? item.username ?? item.owner_username
        ) as string | undefined;
        return [{
          id: `apify_profile_${handle ?? 'unknown'}_${item.id as string ?? item.shortCode as string ?? Math.random()}`,
          source: 'apify' as const,
          raw: { ownerUsername: handle, ...item },
          collectedAt: new Date(),
        }];
      });

      return ok(posts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
