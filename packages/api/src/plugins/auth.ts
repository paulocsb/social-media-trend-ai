import { createHash, scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { parseEnv, UnauthorizedError } from '@trend/shared';
import { getUser, getUserByEmail, setPasswordHash, getTokenByHash } from '@trend/db';

const scryptAsync = promisify(scrypt);
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, derived);
}

async function plugin(app: FastifyInstance) {
  const env = parseEnv();

  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  // Seed admin password on startup if not yet set
  if (env.ADMIN_PASSWORD) {
    const user = await getUser(DEFAULT_USER_ID);
    if (user && !user.passwordHash) {
      const hash = await hashPassword(env.ADMIN_PASSWORD);
      await setPasswordHash(DEFAULT_USER_ID, hash);
      app.log.info('[auth] Admin password seeded from ADMIN_PASSWORD env var');
    }
  }

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ ok: false, code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' });
    }
  });

  // Email + password login
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      return reply.status(400).send({ ok: false, message: 'Email e senha são obrigatórios' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return reply.status(401).send({ ok: false, message: 'Credenciais inválidas' });
    }

    // Dev shortcut: password 'dev' works when no password is set (local only)
    const isDev = !user.passwordHash && password === 'dev';
    if (!isDev) {
      if (!user.passwordHash) {
        return reply.status(401).send({ ok: false, message: 'Senha não configurada. Defina ADMIN_PASSWORD no servidor.' });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ ok: false, message: 'Credenciais inválidas' });
      }
    }

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' });
    return reply.send({ ok: true, token });
  });

  // Legacy API-key endpoint (kept for backward compat / dev tooling)
  app.post('/api/auth/token', async (request, reply) => {
    const { apiKey } = request.body as { apiKey?: string };
    if (apiKey === 'dev') {
      const token = app.jwt.sign({ sub: DEFAULT_USER_ID }, { expiresIn: '7d' });
      return reply.send({ ok: true, token });
    }
    if (apiKey) {
      const row = await getTokenByHash(createHash('sha256').update(apiKey).digest('hex'));
      if (row) {
        const token = app.jwt.sign({ sub: row.userId }, { expiresIn: '7d' });
        return reply.send({ ok: true, token });
      }
    }
    throw new UnauthorizedError('Invalid API key');
  });
}

export const authPlugin = fp(plugin);
