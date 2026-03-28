import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Newspaper, BrainCircuit } from 'lucide-react'
import { EventsPanel } from '@/features/events/EventsPanel'
import { AnalysisPanel } from '@/features/analysis/AnalysisPanel'
import { useT } from '@/lib/i18n'

export function AnalisePage() {
  const t = useT()
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">{t.pages.analysis.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.pages.analysis.subtitle}</p>
      </div>

      <Tabs defaultValue="analysis">
        <TabsList>
          <TabsTrigger value="analysis" className="gap-2">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Newspaper className="h-3.5 w-3.5" />
            Detected Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <AnalysisPanel />
        </TabsContent>

        <TabsContent value="events">
          <EventsPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
