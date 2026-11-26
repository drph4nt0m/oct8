import { Context, Next } from 'hono';
import { AppEnv } from '#api/http/app-types';

export const analyticsMiddleware = async (c: Context<AppEnv>, next: Next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  const route = c.req.path;
  const method = c.req.method;
  const status = c.res.status.toString();

  // Cloudflare Analytics Engine
  // Assuming a binding named ANALYTICS exists in wrangler.toml
  const analytics = c.env.ANALYTICS;

  if (analytics && typeof analytics.writeDataPoint === 'function') {
    analytics.writeDataPoint({
      blobs: [
        method,
        route,
        status,
        c.req.header('cf-connecting-ip') || 'unknown', // track IP approximations if needed
      ],
      doubles: [duration],
      indexes: [route], // Allows efficient querying by route
    });
  }
};
