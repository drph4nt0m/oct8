import { Context, Next } from 'hono';
import { logger } from '#infra/logger/logger';

export const loggerMiddleware = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const requestId = c.get('requestId') as string;

    // Create a child logger for this request
    const requestLogger = logger.child({ requestId });
    c.set('logger', requestLogger);

    try {
      await next();
    } finally {
      const duration = Date.now() - start;
      const status = c.res.status;
      const method = c.req.method;
      const path = c.req.path;

      const logMsg = `HTTP ${method} ${path} ${status} - ${duration}ms`;

      // WaitUntil to not block response
      const logPromise = Promise.resolve().then(() => {
        if (status >= 500) {
          requestLogger.error(logMsg, { status, duration, method, path });
        } else if (status >= 400) {
          requestLogger.warn(logMsg, { status, duration, method, path });
        } else {
          requestLogger.info(logMsg, { status, duration, method, path });
        }
      });

      try {
        if (c.executionCtx && c.executionCtx.waitUntil) {
          c.executionCtx.waitUntil(logPromise);
        } else {
          // Fire and forget for Node/other envs
          logPromise.catch((err) => logger.error('Logging failed', err));
        }
      } catch {
        // If executionCtx access throws (e.g. in tests), just fire and forget
        logPromise.catch((err) => logger.error('Logging failed', err));
      }
    }
  };
};
