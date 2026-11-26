import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
// honoLogger removed

import { analyticsMiddleware } from '#api/http/middleware/analytics';
import { requestId } from '#api/http/middleware/request-id';
import { loggerMiddleware } from '#api/http/middleware/logger-middleware';
import { HealthController } from '#api/http/controllers/health-controller';
import { logger as appLogger } from '#infra/logger/logger';
import { AppEnv } from '#api/http/app-types';

export function createCoreApp<T extends AppEnv = AppEnv>() {
  const app = new OpenAPIHono<T>();

  // Middleware
  app.use('*', requestId());
  app.use('*', loggerMiddleware());
  app.use('*', cors());
  app.use('*', analyticsMiddleware);

  // Global Error Handling
  app.onError((err, c) => {
    appLogger.error(`[App Error] ${err.message}`, err);

    // Use the explicitly typed environment available in AppEnv context
    const isDev = c.env?.ENVIRONMENT === 'development';
    const isDebug = c.env?.LOG_LEVEL === 'debug';

    // Fallback if not injected yet
    const reqId = c.get('requestId') || 'unknown';

    return c.json(
      {
        error: 'internal_server_error',
        message: err.message || 'Internal Server Error',
        requestId: reqId,
        stack: isDev || isDebug ? err.stack : undefined,
      },
      500,
    );
  });

  // Shared Routes

  // Health
  const healthController = new HealthController('oct8-insight-engine');
  app.get('/health', (c) => healthController.getHealth(c));

  // Documentation
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Oct8 IP Service API',
      description: 'A high-performance IP information service.',
    },
  });

  app.get(
    '/reference',
    apiReference({
      spec: {
        url: '/doc',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
  );

  // Convenience redirect
  app.get('/docs', (c) => c.redirect('/reference'));

  return app;
}
