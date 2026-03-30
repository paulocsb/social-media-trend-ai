import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clipboard, Send, Sparkles, ChevronDown, ChevronUp, Clock, Lightbulb, Hash, ImageIcon, Trash2 } from 'lucide-react';
import { IconButton } from '../components/ui/icon-button';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { relativeTime, cn } from '../lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };
}

function normalizeHashtag(h: string) {
  return h.replace(/^#+/, '');
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all',
        copied
          ? 'bg-success/15 text-success'
          : 'bg-white/8 text-secondary hover:text-primary hover:bg-white/12',
        className,
      )}
    >
      <Clipboard className="w-3 h-3" />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function SectionDivider() {
  return <div className="border-t border-border-subtle" />;
}

function SectionLabel({ icon: Icon, label }: { icon?: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-tertiary" />}
      <span className="text-label">{label}</span>
    </div>
  );
}

export function AnalisePage() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: providers = [] } = useQuery({
    queryKey: ['analysis-providers'],
    queryFn: async () => {
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analysis/providers`, { headers });
      if (!res.ok) return [];
      const json = await res.json();
      return json.providers as string[];
    },
  });

  const hasAI = providers.length > 0;
  const providerLabel: Record<string, string> = { anthropic: 'Claude', openai: 'GPT-4o', ollama: 'Ollama' };

  const runWithAI = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analysis/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId: activeCampaignId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses', activeCampaignId] }),
  });

  const loadPrompt = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/analysis/prompt?campaignId=${activeCampaignId}`,
        { headers },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.prompt as string;
    },
    onSuccess: (p) => setPrompt(p),
  });

  const submit = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(response); } catch { throw new Error('Invalid JSON — paste the exact JSON from the AI.'); }
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analysis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId: activeCampaignId, ...parsed }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setResponse('');
      qc.invalidateQueries({ queryKey: ['analyses', activeCampaignId] });
    },
  });

  const deleteAnalysis = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_analyses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (expanded === id) setExpanded(null);
      qc.invalidateQueries({ queryKey: ['analyses', activeCampaignId] });
    },
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-title-xl">Analysis</h1>

      {/* Auto AI run */}
      {hasAI && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-primary">
                  Run with {providerLabel[providers[0]] ?? providers[0]}
                </p>
                <p className="text-[13px] text-secondary mt-0.5">
                  Build the prompt, call the AI, and generate content in one click.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {runWithAI.isError && (
                <p className="text-[12px] text-destructive max-w-[200px] text-right">
                  {(runWithAI.error as Error).message}
                </p>
              )}
              {runWithAI.isSuccess && (
                <p className="text-[12px] text-success font-medium">Saved ✓</p>
              )}
              <Button
                onClick={() => runWithAI.mutate()}
                disabled={runWithAI.isPending || !activeCampaignId}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {runWithAI.isPending ? 'Running…' : 'Run Analysis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual section */}
      <div className="rounded-xl border border-dashed border-border transition-all">
        {/* Toggle header */}
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setShowManual((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-tertiary" />
            <span className="text-[13px] font-medium text-secondary">
              {hasAI ? 'Manual copy & paste' : 'Generate prompt for your AI'}
            </span>
          </div>
          <span className="p-2 rounded-full border bg-white/[0.06] border-white/[0.1] text-secondary flex items-center justify-center">
            {showManual
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </span>
        </button>

        {/* Content */}
        {showManual && (
          <div className="px-5 pb-5 border-t border-border-subtle">
            <div className="grid grid-cols-2 gap-5 pt-5">
              {/* Step 1 */}
              <Card>
                <CardHeader><CardTitle>1 · Generate Prompt</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[13px] text-secondary">
                    Generate a prompt from your recent data, then paste it into your AI of choice (ChatGPT, Claude, etc.).
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => loadPrompt.mutate()}
                    disabled={loadPrompt.isPending || !activeCampaignId}
                  >
                    {loadPrompt.isPending ? 'Loading…' : 'Generate Prompt'}
                  </Button>
                  {prompt && (
                    <div className="relative">
                      <textarea
                        readOnly
                        value={prompt}
                        className="w-full h-48 rounded-lg bg-white/5 border border-border-subtle px-3 py-2.5 text-[12px] font-mono text-secondary resize-none focus:outline-none"
                      />
                      <CopyButton text={prompt} className="absolute top-2 right-2" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card>
                <CardHeader><CardTitle>2 · Submit AI Response</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[13px] text-secondary">
                    Paste the JSON returned by the AI below.
                  </p>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder='{"selectedPostIds":[],"mainTopic":"…"}'
                    className="w-full h-48 rounded-lg bg-white/5 border border-border-subtle px-3 py-2.5 text-[12px] font-mono text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                  />
                  {submit.error && (
                    <p className="text-[12px] text-destructive">{(submit.error as Error).message}</p>
                  )}
                  <Button
                    onClick={() => submit.mutate()}
                    disabled={!response.trim() || submit.isPending}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submit.isPending ? 'Saving…' : 'Save Analysis'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Analyses list */}
      {analyses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-title">Analyses</h2>
          {analyses.map((a) => {
            const isOpen = expanded === a.id;
            const gc = a.generated_content as Record<string, unknown> | null;

            return (
              <Card key={a.id} className={cn(isOpen && 'shadow-panel')}>
                {/* Header row */}
                <CardHeader className="gap-2">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate">{a.main_topic}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-caption">
                        <Clock className="w-3 h-3" />
                        {relativeTime(a.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          a.urgency_level === 'high' ? 'destructive'
                          : a.urgency_level === 'medium' ? 'warning'
                          : 'secondary'
                        }
                      >
                        {a.urgency_level}
                      </Badge>
                      <span className="p-2 rounded-full border bg-white/[0.06] border-white/[0.1] text-secondary flex items-center justify-center">
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />
                        }
                      </span>
                    </div>
                  </button>

                  {/* Delete */}
                  <IconButton
                    icon={Trash2}
                    variant="destructive"
                    onClick={() => deleteAnalysis.mutate(a.id)}
                    disabled={deleteAnalysis.isPending}
                    title="Delete analysis"
                  />
                </CardHeader>

                {isOpen && (
                  <CardContent className="pt-0 space-y-0">

                    {a.reasoning && (
                      <>
                        <SectionDivider />
                        <div className="py-5">
                          <SectionLabel label="Reasoning" />
                          <p className="text-[13px] text-secondary leading-relaxed">{a.reasoning}</p>
                        </div>
                      </>
                    )}

                    {a.content_ideas?.length > 0 && (
                      <>
                        <SectionDivider />
                        <div className="py-5">
                          <SectionLabel icon={Lightbulb} label="Content Ideas" />
                          <ol className="space-y-2.5">
                            {a.content_ideas.map((idea: string, i: number) => (
                              <li key={i} className="flex gap-3">
                                <span className="text-[12px] font-semibold text-accent mt-0.5 shrink-0 w-4">{i + 1}.</span>
                                <span className="text-[13px] text-secondary leading-relaxed">{idea}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </>
                    )}

                    {a.suggested_hashtags?.length > 0 && (
                      <>
                        <SectionDivider />
                        <div className="py-5">
                          <SectionLabel icon={Hash} label="Suggested Hashtags" />
                          <div className="flex flex-wrap gap-1.5">
                            {a.suggested_hashtags.map((h: string) => (
                              <Badge key={h} variant="default">#{normalizeHashtag(h)}</Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {gc && (
                      <>
                        <SectionDivider />
                        <div className="py-5 space-y-5">
                          <SectionLabel icon={Sparkles} label="Generated Content" />

                          {gc.caption && (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary mb-2">Caption</p>
                              <div className="relative rounded-xl bg-white/5 border border-border-subtle p-4">
                                <pre className="text-[13px] text-primary whitespace-pre-wrap font-sans leading-relaxed pr-14 max-h-48 overflow-auto">
                                  {gc.caption as string}
                                </pre>
                                <CopyButton text={gc.caption as string} className="absolute top-3 right-3" />
                              </div>
                            </div>
                          )}

                          {gc.visualDescription && (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary mb-2 flex items-center gap-1.5">
                                <ImageIcon className="w-3 h-3" /> Visual Idea
                              </p>
                              <p className="text-[13px] text-secondary leading-relaxed rounded-xl bg-white/5 border border-border-subtle px-4 py-3">
                                {gc.visualDescription as string}
                              </p>
                            </div>
                          )}

                          {Array.isArray(gc.hashtags) && gc.hashtags.length > 0 && (
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary mb-2">Hashtags</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(gc.hashtags as string[]).map((h) => (
                                  <Badge key={h} variant="secondary">#{normalizeHashtag(h)}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {gc.bestPostingTime && (
                            <div className="flex items-center gap-2 text-[13px]">
                              <Clock className="w-3.5 h-3.5 text-tertiary shrink-0" />
                              <span className="text-tertiary">Best time to post:</span>
                              <span className="text-primary font-medium">{gc.bestPostingTime as string}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {a.content_prompt && !gc && (
                      <>
                        <SectionDivider />
                        <div className="py-5">
                          <SectionLabel label="Content Prompt" />
                          <div className="relative rounded-xl bg-white/5 border border-border-subtle p-4">
                            <pre className="text-[12px] font-mono text-secondary whitespace-pre-wrap max-h-40 overflow-auto pr-12">
                              {a.content_prompt}
                            </pre>
                            <CopyButton text={a.content_prompt} className="absolute top-3 right-3" />
                          </div>
                        </div>
                      </>
                    )}

                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
