import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clipboard, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { relativeTime, cn } from '../lib/utils';

export function AnalisePage() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load analysis prompt
  const loadPrompt = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analysis/prompt?campaignId=${activeCampaignId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.prompt as string;
    },
    onSuccess: (p) => setPrompt(p),
  });

  // Submit AI response
  const submit = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(response); } catch { throw new Error('Invalid JSON — paste the exact JSON from the AI.'); }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
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

  // Past analyses
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
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-title-xl">Analysis</h1>

      {/* Workflow */}
      <div className="grid grid-cols-2 gap-5">
        {/* Step 1: Generate prompt */}
        <Card>
          <CardHeader>
            <CardTitle>1 · Generate Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  className="w-full h-48 rounded-md bg-[#F5F5F7] px-3 py-2.5 text-[12px] font-mono text-secondary resize-none focus:outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(prompt)}
                  className="absolute top-2 right-2 flex items-center gap-1 text-[11px] text-accent bg-surface rounded px-2 py-1 shadow-subtle hover:shadow"
                >
                  <Clipboard className="w-3 h-3" /> Copy
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Submit response */}
        <Card>
          <CardHeader>
            <CardTitle>2 · Submit AI Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[13px] text-secondary">
              Paste the JSON returned by the AI below.
            </p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder='{"selectedPostIds":[],"mainTopic":"…"}'
              className="w-full h-48 rounded-md bg-[#F5F5F7] px-3 py-2.5 text-[12px] font-mono text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent"
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

      {/* Past analyses */}
      {analyses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-title">Past Analyses</h2>
          {analyses.map((a) => (
            <Card key={a.id}>
              <button
                className="w-full text-left"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{a.main_topic}</p>
                      <p className="text-caption mt-0.5">{relativeTime(a.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={a.urgency_level === 'high' ? 'destructive' : a.urgency_level === 'medium' ? 'warning' : 'secondary'}>
                        {a.urgency_level}
                      </Badge>
                      {expanded === a.id ? <ChevronUp className="w-4 h-4 text-tertiary" /> : <ChevronDown className="w-4 h-4 text-tertiary" />}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {expanded === a.id && (
                <CardContent className={cn('pt-0 space-y-3 border-t border-border-subtle')}>
                  {a.reasoning && <p className="text-[13px] text-secondary">{a.reasoning}</p>}
                  {a.suggested_hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {a.suggested_hashtags.map((h: string) => (
                        <Badge key={h} variant="default">#{h}</Badge>
                      ))}
                    </div>
                  )}
                  {a.content_ideas?.length > 0 && (
                    <ul className="space-y-1">
                      {a.content_ideas.map((idea: string, i: number) => (
                        <li key={i} className="text-[13px] text-secondary flex gap-2">
                          <span className="text-tertiary shrink-0">{i + 1}.</span>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.content_prompt && (
                    <div>
                      <p className="text-label mb-2">Content Prompt</p>
                      <div className="relative">
                        <pre className="text-[11px] font-mono text-secondary bg-[#F5F5F7] rounded-md p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                          {a.content_prompt}
                        </pre>
                        <button
                          onClick={() => navigator.clipboard.writeText(a.content_prompt!)}
                          className="absolute top-2 right-2 text-[11px] text-accent bg-surface rounded px-2 py-1 shadow-subtle hover:shadow"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
