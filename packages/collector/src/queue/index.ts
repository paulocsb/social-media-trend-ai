import Bull from 'bull';
import { createBullRedis } from '@trend/db';

export const QUEUES = {
  COLLECT_HASHTAG: 'collect:hashtag',
  COLLECT_PROFILE: 'collect:profile',
} as const;

export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

function makeQueue(name: string) {
  return new Bull(name, {
    createClient: (type) => {
      if (type === 'client') return createBullRedis();
      if (type === 'subscriber') return createBullRedis();
      return createBullRedis();
    },
  });
}

export const hashtagQueue = makeQueue(QUEUES.COLLECT_HASHTAG);
export const profileQueue  = makeQueue(QUEUES.COLLECT_PROFILE);
