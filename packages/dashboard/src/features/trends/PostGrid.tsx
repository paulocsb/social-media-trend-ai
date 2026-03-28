import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, Heart, MessageCircle, Eye, Film, ImageIcon, ExternalLink, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

const BASE = import.meta.env.VITE_API_URL ?? ''
function imgProxy(url?: string) {
  if (!url) return undefined
  return `${BASE}/api/proxy/image?url=${encodeURIComponent(url)}`
}

type Post = {
  id: string
  mediaType: string
  trendScore: number
  hashtags: string[]
  likes: number
  comments: number
  views: number
  thumbnailUrl?: string
  permalink?: string
  caption?: string
  authorHandle?: string
}

export function PostGrid() {
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const { activeCampaignId } = useCampaign()

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', '24h', verifiedOnly, activeCampaignId],
    queryFn: () => activeCampaignId ? api.getPosts(activeCampaignId, '24h', 20, verifiedOnly) : Promise.resolve({ ok: true as const, posts: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const posts = (data?.posts ?? []) as Post[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <LayoutGrid className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <CardTitle className="text-base">Viral Posts</CardTitle>
              <CardDescription>Highest trend scores · last 24h</CardDescription>
            </div>
          </div>
          <button
            onClick={() => setVerifiedOnly((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
              verifiedOnly
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
            title={verifiedOnly ? 'Showing only tracked profiles — click to show all' : 'Showing all sources — click to filter by tracked profiles'}
          >
            <ShieldCheck className="h-3 w-3" />
            {verifiedOnly ? 'Verified only' : 'All sources'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">Failed to load posts.</p>}
        {!isLoading && !error && posts.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No posts collected yet.</div>
        )}
        {!isLoading && !error && posts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {posts.map((post) => {
              const score = post.trendScore
              const isReel = post.mediaType === 'REEL' || post.mediaType === 'VIDEO'
              return (
                <div key={post.id} className={cn(
                  'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
                  score >= 70 && 'ring-1 ring-amber-400/60'
                )}>
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full bg-muted overflow-hidden">
                    {post.thumbnailUrl ? (
                      <img
                        src={imgProxy(post.thumbnailUrl)}
                        alt={post.caption?.slice(0, 60) ?? 'Post'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Overlay badges */}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
                      {isReel && (
                        <span className="flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          <Film className="h-2.5 w-2.5" /> Reel
                        </span>
                      )}
                      <Badge
                        variant={score >= 70 ? 'default' : 'secondary'}
                        className="ml-auto text-[10px] px-1.5 cursor-help"
                        title={`Trend score: ${score.toFixed(1)}\nVelocity 40% · Engagement rate 30% · Absolute engagement 20% · Recency 10%`}
                      >
                        {score.toFixed(0)}
                      </Badge>
                    </div>
                    {/* Instagram link overlay */}
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
                      >
                        <ExternalLink className="h-6 w-6 text-white drop-shadow" />
                      </a>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1.5 p-2">
                    {/* Stats */}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" />{post.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" />{post.comments.toLocaleString()}
                      </span>
                      {post.views > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />{post.views.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Author */}
                    {post.authorHandle && (
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        @{post.authorHandle}
                      </span>
                    )}

                    {/* Caption */}
                    {post.caption && (
                      <p className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                        {post.caption}
                      </p>
                    )}

                    {/* Hashtags */}
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags.slice(0, 2).map((tag) => (
                          <span key={tag} className="truncate rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                        {post.hashtags.length > 2 && (
                          <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            +{post.hashtags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
