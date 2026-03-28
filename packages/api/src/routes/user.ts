import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUser, updateUser, setPasswordHash, listApiTokens, createApiToken, revokeApiToken } from '@trend/db';

const scryptAsync = promisify(scrypt);

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

type AuthApp = FastifyInstance & { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateRawToken(): string {
  return `ti_${randomBytes(32).toString('hex')}`;
}

export async function userRoutes(fastify: FastifyInstance) {
  const app = fastify as AuthApp;
  const auth = { onRequest: [app.authenticate] };

  app.get('/api/user/me', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const user = await getUser(sub);
    return { ok: true, user };
  });

  app.patch('/api/user/me', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const { name, email } = request.body as { name?: string; email?: string | null };
    const user = await updateUser(sub, { name, email });
    return { ok: true, user };
  });

  app.get('/api/user/tokens', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const tokens = await listApiTokens(sub);
    return { ok: true, tokens };
  });

  app.post('/api/user/tokens', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const { name } = request.body as { name: string };
    if (!name?.trim()) return reply.status(400).send({ ok: false, message: 'Token name is required' });

    const rawToken = generateRawToken();
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const token = await createApiToken(sub, name.trim(), tokenHash);
    return reply.status(201).send({ ok: true, token: { ...token, rawToken } });
  });

  // PATCH /api/user/password
  app.patch('/api/user/password', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const { currentPassword, newPassword } = request.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) return reply.status(400).send({ ok: false, message: 'Campos obrigatórios' });
    if (newPassword.length < 8) return reply.status(400).send({ ok: false, message: 'Senha deve ter mínimo 8 caracteres' });

    const user = await getUser(sub);
    if (!user) return reply.status(404).send({ ok: false, message: 'Usuário não encontrado' });

    // Allow 'dev' as current password if no hash is set (dev shortcut)
    const isDev = !user.passwordHash && currentPassword === 'dev';
    if (!isDev) {
      if (!user.passwordHash) return reply.status(400).send({ ok: false, message: 'Senha não configurada no servidor' });
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) return reply.status(401).send({ ok: false, message: 'Senha atual incorreta' });
    }

    const hash = await hashPassword(newPassword);
    await setPasswordHash(sub, hash);
    return { ok: true };
  });

  app.delete('/api/user/tokens/:id', auth, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    if (!UUID_RE.test(sub)) return reply.status(401).send({ ok: false, message: 'Token legado — faça login novamente' });
    const { id } = request.params as { id: string };
    const deleted = await revokeApiToken(id, sub);
    if (!deleted) return reply.status(404).send({ ok: false, message: 'Token not found' });
    return { ok: true };
  });
}
