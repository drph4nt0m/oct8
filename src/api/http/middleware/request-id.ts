import { Context, Next } from 'hono';

import { runWithContext } from '#infra/context/context';

export const requestId = () => {
  return async (c: Context, next: Next) => {
    let id = c.req.header('x-request-id');

    // 1. Try W3C Traceparent: version-traceid-parentid-flags
    // We want the 'traceid' part (32 hex chars)
    const traceParent = c.req.header('traceparent');
    if (!id && traceParent) {
      const parts = traceParent.split('-');
      if (parts.length === 4) {
        id = parts[1];
      }
    }

    // 2. Try Cloudflare Ray ID
    if (!id) {
      const cfRay = c.req.header('cf-ray');
      if (cfRay) {
        id = cfRay;
      }
    }

    // 3. Fallback
    if (!id) {
      id = crypto.randomUUID();
    }

    c.set('requestId', id);
    c.header('x-request-id', id);

    await runWithContext({ requestId: id }, next);
  };
};
