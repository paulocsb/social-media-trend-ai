import type { FastifyInstance } from 'fastify';
import { AppError } from '@trend/shared';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        ok: false,
        code: error.code,
        message: error.message,
      });
    }
    app.log.error(error);
    return reply.status(500).send({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });
}
