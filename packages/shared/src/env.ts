import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  IG_TOKENS: z.string().optional().default(''),
  JWT_SECRET: z.string().min(32),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  PORT: z.coerce.number().default(3000),
  APIFY_TOKEN: z.string().optional().or(z.literal('').transform(() => undefined)),
  VITE_API_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(env: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`[env] Missing or invalid environment variables:\n${issues}`);
    process.exit(1);
  }
  return result.data as Env;
}
