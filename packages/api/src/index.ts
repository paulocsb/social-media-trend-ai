import Fastify from 'fastify';
import cors from '@fastify/cors';
import { parseEnv } from '@trend/shared';
import { authPlugin } from './plugins/auth.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { trendsRoutes } from './routes/trends.js';
import { alertsRoutes } from './routes/alerts.js';
import { hashtagsRoutes } from './routes/hashtags.js';
import { jobsRoutes } from './routes/jobs.js';
import { profilesRoutes } from './routes/profiles.js';
import { eventsRoutes } from './routes/events.js';
import { analysisRoutes } from './routes/analysis.js';
import { proxyRoutes } from './routes/proxy.js';
import { userRoutes } from './routes/user.js';
import { runsRoutes } from './routes/runs.js';
import { campaignsRoutes } from './routes/campaigns.js';
import { registerErrorHandler } from './errors/index.js';

async function main() {
  const env = parseEnv();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  registerErrorHandler(app);

  await app.register(trendsRoutes);
  await app.register(alertsRoutes);
  await app.register(hashtagsRoutes);
  await app.register(profilesRoutes);
  await app.register(jobsRoutes);
  await app.register(eventsRoutes);
  await app.register(analysisRoutes);
  await app.register(proxyRoutes);
  await app.register(userRoutes);
  await app.register(runsRoutes);
  await app.register(campaignsRoutes);

  app.get('/health', async () => ({ ok: true }));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
