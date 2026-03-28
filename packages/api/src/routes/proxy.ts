import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const ALLOWED_HOSTS = [
  'cdninstagram.com',
  'scontent.cdninstagram.com',
  'instagram.com',
  'fbcdn.net',
  'scontent.fbcdn.net',
];

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

export async function proxyRoutes(app: FastifyInstance) {
  // GET /api/proxy/image?url=<encoded> — proxies Instagram CDN images
  app.get('/api/proxy/image', async (request: FastifyRequest, reply: FastifyReply) => {
    const { url } = request.query as { url?: string };

    if (!url) return reply.status(400).send('Missing url');
    if (!isAllowedHost(url)) return reply.status(403).send('Host not allowed');

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)',
          'Accept': 'image/*',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return reply.status(502).send('Upstream error');

      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const buffer = Buffer.from(await res.arrayBuffer());

      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=86400') // cache 24h in browser
        .header('Access-Control-Allow-Origin', '*')
        .send(buffer);
    } catch {
      return reply.status(502).send('Failed to fetch image');
    }
  });
}
