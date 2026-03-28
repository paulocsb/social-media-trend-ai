import { JobsPanel } from '@/features/jobs/JobsPanel'

export function SistemaPage() {
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">System</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Global infrastructure · job queues across all campaigns
        </p>
      </div>
      <div className="max-w-3xl">
        <JobsPanel />
      </div>
    </>
  )
}
