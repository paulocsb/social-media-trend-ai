import { Redis } from 'ioredis';
import { parseEnv } from '@trend/shared';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    const env = parseEnv();
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    client.on('error', (err) => {
      console.error('[redis] Client error', err);
    });
  }
  return client;
}

/** Dedicated Redis connection for Bull queues — never share with app client */
export function createBullRedis(): Redis {
  const env = parseEnv();
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
