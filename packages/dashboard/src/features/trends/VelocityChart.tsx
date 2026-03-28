import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTheme } from '@/lib/theme'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

export function VelocityChart() {
  const { theme } = useTheme()
  const { activeCampaignId } = useCampaign()
  const isDark = theme === 'dark'

  const { data, isLoading, error } = useQuery({
    queryKey: ['velocity', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getVelocity(activeCampaignId) : Promise.resolve({ ok: true as const, velocity: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const chartData = data?.velocity ?? []

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base">Hashtag Velocity</CardTitle>
            <CardDescription>Growth rate · 1h vs 6h</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-[280px] animate-pulse rounded-lg bg-muted" />}
        {error && <p className="text-sm text-destructive">Failed to load chart.</p>}
        {!isLoading && !error && chartData.length === 0 && (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No velocity data yet.
          </div>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hashtag"
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                  backgroundColor: isDark ? 'hsl(222.2 84% 7%)' : '#fff',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={`hsl(${239 + index * 15} 84% ${isDark ? 65 + index * 2 : 60 + index * 2}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
