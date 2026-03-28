import type { RawPost, NormalizedPost } from '@trend/shared';

type MediaType = 'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL';

function normalizeMediaType(raw: string | undefined): MediaType {
  const upper = (raw ?? '').toUpperCase();
  if (upper === 'REEL' || upper === 'VIDEO') return 'REEL';
  if (upper === 'CAROUSEL_ALBUM' || upper === 'CAROUSEL') return 'CAROUSEL';
  if (upper === 'VIDEO') return 'VIDEO';
  return 'IMAGE';
}

function extractHashtags(caption: string | undefined): string[] {
  if (!caption) return [];
  return [...caption.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
}

export function normalizePost(raw: RawPost): NormalizedPost {
  const r = raw.raw as Record<string, unknown>;
  const caption = (r.caption as string | undefined);
  const shortCode = (r.shortCode as string | undefined) ?? (r.shortcode as string | undefined);

  // Use Apify's pre-extracted hashtags array if available (more accurate than regex)
  const apifyHashtags = Array.isArray(r.hashtags)
    ? (r.hashtags as string[]).map((h) => h.replace(/^#/, '').toLowerCase())
    : null;

  return {
    id: raw.id,
    source: raw.source,
    hashtags: apifyHashtags ?? extractHashtags(caption),
    likes:    (r.likesCount    as number | undefined) ?? (r.like_count    as number | undefined) ?? 0,
    comments: (r.commentsCount as number | undefined) ?? (r.comments_count as number | undefined) ?? (r.comment_count as number | undefined) ?? 0,
    shares:   (r.share_count   as number | undefined) ?? 0,
    views:    (r.videoViewCount as number | undefined) ?? (r.video_view_count as number | undefined) ?? (r.play_count as number | undefined) ?? 0,
    mediaType: normalizeMediaType((r.type as string | undefined) ?? (r.media_type as string | undefined)),
    authorHandle: (r.ownerUsername as string | undefined) ?? (r.username as string | undefined) ?? (r.owner_username as string | undefined) ?? ((r.owner as Record<string, unknown>)?.username as string | undefined) ?? undefined,
    publishedAt: (() => {
      const raw = r.timestamp ?? r.takenAtTimestamp ?? r.taken_at_timestamp ?? r.takenAt ?? r.postedAt ?? r.date;
      if (!raw) return undefined;
      // Unix seconds (number)
      if (typeof raw === 'number' && !isNaN(raw)) {
        const d = new Date(raw < 1e10 ? raw * 1000 : raw); // handle ms vs seconds
        return isNaN(d.getTime()) ? undefined : d;
      }
      // ISO string
      if (typeof raw === 'string') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    })(),
    collectedAt: raw.collectedAt,
    thumbnailUrl: (r.displayUrl as string | undefined) ?? (r.thumbnailUrl as string | undefined) ?? undefined,
    permalink: (r.url as string | undefined) ?? (shortCode ? `https://www.instagram.com/p/${shortCode}/` : undefined),
    caption: caption ?? undefined,
  };
}

export function normalizePosts(rawPosts: RawPost[]): NormalizedPost[] {
  return rawPosts
    .map(normalizePost)
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i); // dedup by id
}
