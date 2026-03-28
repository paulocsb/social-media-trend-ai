import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BrainCircuit, Copy, Check, ChevronDown, ChevronUp,
  Loader2, Send, Sparkles, AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

type AIAnalysis = {
  id: string
  createdAt: string
  selectedPostIds: string[]
  mainTopic: string
  reasoning: string | null
  suggestedHashtags: string[]
  contentIdeas: string[]
  urgencyLevel: 'high' | 'medium' | 'low'
  contentFormat: 'reel' | 'carousel' | 'image' | 'any'
  contentPrompt: string | null
}

const URGENCY_STYLE = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  low:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

// ── Step 1: Generate & Copy Prompt ──────────────────────────────────────────
function PromptStep({ onNext }: { onNext: () => void }) {
  const { activeCampaignId } = useCampaign()
  const [copied, setCopied] = useState(false)
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['analysis-prompt', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getAnalysisPrompt(activeCampaignId) : Promise.resolve({ ok: true as const, prompt: '', meta: { postCount: 0, eventCount: 0, hashtagCount: 0 } }),
    enabled: Boolean(activeCampaignId),
    staleTime: 60_000,
  })

  function copyPrompt() {
    if (!data?.prompt) return
    navigator.clipboard.writeText(data.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data?.meta
            ? `Based on ${data.meta.postCount} posts, ${data.meta.eventCount} events, ${data.meta.hashtagCount} hashtags`
            : 'Loads data from the last 24–48h'}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
        >
          {isFetching ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
      {error && <p className="text-sm text-destructive">Failed to generate prompt.</p>}

      {data?.prompt && (
        <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
          <pre className="whitespace-pre-wrap">{data.prompt}</pre>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Button onClick={copyPrompt} disabled={!data?.prompt} className="flex-1" variant="outline">
          {copied ? <><Check className="mr-2 h-4 w-4 text-emerald-500" />Copied!</> : <><Copy className="mr-2 h-4 w-4" />Copy Prompt</>}
        </Button>
        <Button onClick={onNext} disabled={!data?.prompt}>
          Next: Input AI Response <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Paste this prompt into Claude, ChatGPT, or any AI — then paste the JSON response in the next step.
      </p>
    </div>
  )
}

// ── Step 2: Paste AI JSON Response ──────────────────────────────────────────
const DEFAULT_SCHEMA = `{
  "selectedPostIds": [],
  "mainTopic": "",
  "reasoning": "",
  "suggestedHashtags": [],
  "contentIdeas": [],
  "urgencyLevel": "high",
  "contentFormat": "reel"
}`

function ResponseStep({ onBack, onSubmit }: { onBack: () => void; onSubmit: (a: AIAnalysis) => void }) {
  const { activeCampaignId } = useCampaign()
  const qc = useQueryClient()
  const [json, setJson] = useState(DEFAULT_SCHEMA)
  const [parseError, setParseError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: (data: Parameters<typeof api.submitAnalysis>[0]) => api.submitAnalysis(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['latest-analysis'] })
      onSubmit(res.analysis as AIAnalysis)
    },
  })

  function handleSubmit() {
    setParseError(null)
    try {
      const parsed = JSON.parse(json)
      if (!parsed.mainTopic) { setParseError('"mainTopic" is required'); return }
      if (!Array.isArray(parsed.selectedPostIds)) { setParseError('"selectedPostIds" must be an array'); return }
      submit.mutate({ ...parsed, campaignId: activeCampaignId ?? '' })
    } catch {
      setParseError('Invalid JSON — paste the exact JSON from the AI response')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Paste the JSON returned by the AI agent. It must match the schema shown in the prompt.
      </p>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        className="h-[360px] w-full rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        spellCheck={false}
        placeholder={DEFAULT_SCHEMA}
      />

      {parseError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {parseError}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}><ChevronUp className="mr-2 h-4 w-4" />Back</Button>
        <Button onClick={handleSubmit} disabled={submit.isPending} className="flex-1">
          {submit.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            : <><Send className="mr-2 h-4 w-4" />Submit Analysis</>}
        </Button>
      </div>
    </div>
  )
}

// ── Step 3: Results + Content Prompt ────────────────────────────────────────
function ResultStep({ analysis, onReset }: { analysis: AIAnalysis; onReset: () => void }) {
  const [copiedContent, setCopiedContent] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  function copyContentPrompt() {
    if (!analysis.contentPrompt) return
    navigator.clipboard.writeText(analysis.contentPrompt)
    setCopiedContent(true)
    setTimeout(() => setCopiedContent(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{analysis.mainTopic}</p>
          <span className={cn('rounded px-2 py-0.5 text-[10px] font-medium', URGENCY_STYLE[analysis.urgencyLevel])}>
            {analysis.urgencyLevel.toUpperCase()}
          </span>
        </div>
        {analysis.reasoning && <p className="text-xs text-muted-foreground">{analysis.reasoning}</p>}
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant="outline" className="text-[10px]">{analysis.contentFormat}</Badge>
          {analysis.suggestedHashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Selected Post IDs */}
      {analysis.selectedPostIds.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Selected Post IDs ({analysis.selectedPostIds.length})</p>
          <div className="flex flex-wrap gap-1">
            {analysis.selectedPostIds.map((id) => (
              <span key={id} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{id}</span>
            ))}
          </div>
        </div>
      )}

      {/* Content Ideas */}
      {analysis.contentIdeas.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Content Ideas</p>
          <ul className="space-y-1">
            {analysis.contentIdeas.map((idea, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="flex-shrink-0 text-muted-foreground">{i + 1}.</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      {/* Content Creation Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Content Creation Prompt</p>
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showPrompt ? 'Hide' : 'Preview'}
          </button>
        </div>
        {showPrompt && analysis.contentPrompt && (
          <ScrollArea className="h-[320px] rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
            <pre className="whitespace-pre-wrap">{analysis.contentPrompt}</pre>
          </ScrollArea>
        )}
        <div className="flex gap-2">
          <Button onClick={copyContentPrompt} disabled={!analysis.contentPrompt} className="flex-1" variant="outline">
            {copiedContent
              ? <><Check className="mr-2 h-4 w-4 text-emerald-500" />Copied!</>
              : <><Sparkles className="mr-2 h-4 w-4" />Copy Content Prompt</>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>New Analysis</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────
export function AnalysisPanel() {
  const { activeCampaignId } = useCampaign()
  const [step, setStep] = useState<'prompt' | 'response' | 'result'>('prompt')
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)

  const { data: latestData } = useQuery({
    queryKey: ['latest-analysis', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getLatestAnalysis(activeCampaignId) : Promise.resolve({ ok: true as const, analysis: null }),
    enabled: Boolean(activeCampaignId),
  })
  const latest = latestData?.analysis as AIAnalysis | undefined

  function handleAnalysisSubmit(a: AIAnalysis) {
    setAnalysis(a)
    setStep('result')
  }

  function reset() {
    setAnalysis(null)
    setStep('prompt')
  }

  const currentAnalysis = analysis ?? (step === 'result' ? latest : null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <BrainCircuit className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Content Analysis</CardTitle>
              <CardDescription>
                {step === 'prompt' && 'Step 1 — Generate prompt for AI analysis'}
                {step === 'response' && 'Step 2 — Paste AI response'}
                {step === 'result' && 'Step 3 — Review & create content'}
              </CardDescription>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {(['prompt', 'response', 'result'] as const).map((s) => (
              <div
                key={s}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  step === s ? 'bg-violet-500' : 'bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        </div>

        {/* Show latest analysis date if exists and not in result step */}
        {latest && step === 'prompt' && (
          <div className="mt-2 flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Last analysis: <span className="font-medium text-foreground">{latest.mainTopic}</span>
              <span className="ml-2 text-muted-foreground/60">· {new Date(latest.createdAt).toLocaleDateString()}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setAnalysis(latest); setStep('result') }}>
              View
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {step === 'prompt' && <PromptStep onNext={() => setStep('response')} />}
        {step === 'response' && <ResponseStep onBack={() => setStep('prompt')} onSubmit={handleAnalysisSubmit} />}
        {step === 'result' && currentAnalysis && <ResultStep analysis={currentAnalysis} onReset={reset} />}
      </CardContent>
    </Card>
  )
}
