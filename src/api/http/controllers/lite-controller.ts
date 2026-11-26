import { Context } from 'hono';
import { AppEnv } from '#api/http/app-types';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { Insight } from '#core/entities/types';
import { Address4, Address6 } from 'ip-address';
import { rateLimit } from '#api/http/middleware/rate-limit';
import { RATE_LIMITS } from '#core/constants/rate-limits';
const IpAddressSchema = z.string().refine(
  (val) => {
    try {
      if (val.includes(':')) new Address6(val);
      else new Address4(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IP address format' },
);

// Map of route suffixes to extractor functions
const LITE_FIELDS = {
  country: (d: Insight) => d.location?.country_code,
  city: (d: Insight) => d.location?.city,
  asn: (d: Insight) => d.infrastructure?.asn?.toString(),
  org: (d: Insight) => d.infrastructure?.org,
  reverse_dns: (d: Insight) => d.infrastructure?.reverse_dns,
  type: (d: Insight) => d.identity?.type,
} as const;

type LiteField = keyof typeof LITE_FIELDS;

export class LiteController {
  public registerRoutes(app: OpenAPIHono<AppEnv>) {
    // Register a route for each field
    for (const field of Object.keys(LITE_FIELDS) as LiteField[]) {
      const route = createRoute({
        method: 'get',
        path: `/{address}/${field}`,
        summary: `Get ${field} for specific IP`,
        middleware: [rateLimit(RATE_LIMITS.lite)] as const,
        request: {
          params: z.object({
            address: IpAddressSchema.openapi({
              param: { name: 'address', in: 'path' },
              example: '8.8.8.8',
            }),
          }),
        },
        responses: {
          200: {
            content: {
              'text/plain': { schema: z.string() },
            },
            description: `Returns the ${field} as plain text`,
          },
          400: {
            description: 'Bad request - invalid IP format',
          },
          404: {
            description: `${field} not found for this IP`,
          },
        },
      });

      app.openapi(route, async (c) => {
        const { address } = c.req.valid('param');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const _global = globalThis as unknown as { caches?: { default: any } };
        const cache = typeof _global.caches !== 'undefined' ? _global.caches.default : undefined;
        const cacheUrl = new URL(c.req.url);
        const cacheKey = new Request(cacheUrl.toString(), c.req.raw);

        if (cache) {
          const cachedResponse = await cache.match(cacheKey);
          if (cachedResponse) {
            return cachedResponse.clone();
          }
        }

        // Fetch insight data (will use isolate LRU cache if recently fetched)
        const data = await this.getInsight(c, address);

        // Extract field
        const extractor = LITE_FIELDS[field];
        const value = extractor(data);

        if (value === undefined || value === null || value === '') {
          // If the field doesn't exist for this IP, return 404
          const notFoundResponse = new Response('', { status: 404 });
          return notFoundResponse as unknown as Response;
        }

        const cacheControl = 'public, max-age=3600';
        c.header('Cache-Control', cacheControl);
        c.header('Content-Type', 'text/plain');

        const responseText = String(value);
        const response = c.text(responseText);

        if (cache && c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return response;
      });
    }
  }

  private async getInsight(c: Context, ip: string): Promise<Insight> {
    const headers = c.req.header();
    const service = c.get('insightService');
    return service.get(ip, headers);
  }
}
