import { TrendLeaderboard } from '@/features/trends/TrendLeaderboard'
import { VelocityChart } from '@/features/trends/VelocityChart'
import { PostGrid } from '@/features/trends/PostGrid'

export function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Trend overview · last 24h</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendLeaderboard />
        <VelocityChart />
      </div>
      <PostGrid />
    </>
  )
}
