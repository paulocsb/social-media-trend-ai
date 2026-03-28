import { ok, err } from '@trend/shared';
import type { RawPost } from '@trend/shared';
import type { SourceAdapter, CollectOptions } from './adapter.interface.js';

export class ApifyAdapter implements SourceAdapter {
  readonly name = 'apify' as const;

  constructor(private readonly apiToken: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiToken);
  }

  async collect(options: CollectOptions) {
    try {
      const hashtags = options.hashtags ?? [];
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashtags, resultsLimit: options.limit ?? 50 }),
          signal: AbortSignal.timeout(290_000),
        },
      );

      const text = await res.text();
      if (!res.ok) {
        return err(new Error(`Apify error ${res.status}: ${text.slice(0, 200)}`));
      }
      if (!text.trim()) {
        return ok([] as RawPost[]);
      }

      const data = JSON.parse(text) as Array<Record<string, unknown>>;
      const posts: RawPost[] = data.map((item) => ({
        id: `apify_${item.id as string ?? item.shortCode as string ?? Math.random()}`,
        source: 'apify' as const,
        raw: item,
        collectedAt: new Date(),
      }));
      return ok(posts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
