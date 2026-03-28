import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Alerts Edge Function — evaluates active alerts against recent hashtag snapshots.
 * Called after a collection run completes.
 *
 * POST /alerts/evaluate  { campaignId }
 * GET  /alerts?campaignId=...          list alerts
 * POST /alerts                         create alert
 * DELETE /alerts/:id                   delete alert
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/alerts\/?/, '');

  try {
    // POST /alerts/evaluate — check thresholds after a collection run
    if (req.method === 'POST' && path === 'evaluate') {
      const { campaignId } = await req.json() as { campaignId: string };
      if (!campaignId) return new Response(JSON.stringify({ ok: false, error: 'campaignId required' }), { status: 400, headers: corsHeaders });

      const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [{ data: alerts }, { data: snapshots }] = await Promise.all([
        supabase.from('alerts').select('*').eq('campaign_id', campaignId).eq('active', true),
        supabase.from('hashtag_snapshots').select('hashtag, trend_score')
          .eq('campaign_id', campaignId).gte('snapshotted_at', since1h),
      ]);

      const triggered: Array<{ alertId: string; hashtag: string; score: number; threshold: number }> = [];

      for (const alert of alerts ?? []) {
        const match = (snapshots ?? []).find((s) => s.hashtag.toLowerCase() === alert.hashtag.toLowerCase());
        if (match && match.trend_score >= alert.threshold) {
          triggered.push({ alertId: alert.id, hashtag: alert.hashtag, score: match.trend_score, threshold: alert.threshold });
        }
      }

      return new Response(JSON.stringify({ ok: true, triggered }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /alerts?campaignId=...
    if (req.method === 'GET' && path === '') {
      const campaignId = url.searchParams.get('campaignId');
      if (!campaignId) return new Response(JSON.stringify({ ok: false, error: 'campaignId required' }), { status: 400, headers: corsHeaders });

      const { data, error } = await supabase.from('alerts').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, alerts: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /alerts — create
    if (req.method === 'POST' && path === '') {
      const body = await req.json() as { campaignId: string; hashtag: string; threshold: number; userId: string };
      const { data, error } = await supabase.from('alerts').insert({
        campaign_id: body.campaignId,
        user_id: body.userId,
        hashtag: body.hashtag,
        threshold: body.threshold,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, alert: data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /alerts/:id
    if (req.method === 'DELETE' && path) {
      const { error } = await supabase.from('alerts').delete().eq('id', path);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[alerts]', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
