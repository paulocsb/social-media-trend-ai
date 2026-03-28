import type { RawPost, Result } from '@trend/shared';

export interface CollectOptions {
  hashtags?: string[];
  handles?: string[];
  limit?: number;
}

export interface SourceAdapter {
  readonly name: 'graph-api' | 'apify';
  collect(options: CollectOptions): Promise<Result<RawPost[]>>;
  isAvailable(): boolean;
}
