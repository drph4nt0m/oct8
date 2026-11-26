import { Context } from 'hono';
import { AppEnv } from '#api/http/app-types';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { Insight } from '#core/entities/types';
import { InsightSchema } from '#core/schemas/insight';
import { IpExtractor } from '#api/http/middleware/ip-extractor';
import { ContentNegotiator } from '#api/http/presenters/content-negotiator';
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

export class IpController {
  public registerRoutes(app: OpenAPIHono<AppEnv>) {
    // GET /
    const getIpRoute = createRoute({
      method: 'get',
      path: '/',
      summary: 'Get requester IP info',
      middleware: [rateLimit(RATE_LIMITS.default)] as const,
      responses: {
        200: {
          content: {
            'application/json': { schema: InsightSchema },
            'application/xml': { schema: z.string() },
            'application/yaml': { schema: z.string() },
            'text/plain': { schema: z.string() },
            'text/html': { schema: z.string() },
          },
          description: 'Successful response',
        },
        400: {
          content: {
            'application/json': {
              schema: z.object({
                error: z.string().openapi({ example: 'Invalid client IP address' }),
              }),
            },
          },
          description: 'Bad request - invalid IP',
        },
      },
    });

    app.openapi(getIpRoute, async (c) => {
      const ip = IpExtractor.getClientIp(c);
      const parsedIp = IpAddressSchema.safeParse(ip);
      if (!parsedIp.success) {
        return c.json({ error: 'Invalid client IP address' }, 400);
      }
      const data = await this.getInsight(c, parsedIp.data);
      return ContentNegotiator.formatResponse(c, data, {
        cacheControl: 'private, no-cache',
      });
    });

    // GET /:address
    const getAddressRoute = createRoute({
      method: 'get',
      path: '/{address}',
      summary: 'Get info for specific IP',
      middleware: [rateLimit(RATE_LIMITS.default)] as const,
      request: {
        params: z.object({
          address: IpAddressSchema.openapi({
            param: { name: 'address', in: 'path' },
            example: '1.2.3.4',
          }),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': { schema: InsightSchema },
            'application/xml': { schema: z.string() },
            'application/yaml': { schema: z.string() },
            'text/plain': { schema: z.string() },
            'text/html': { schema: z.string() },
          },
          description: 'Successful response',
        },
        400: {
          content: {
            'application/json': {
              schema: z.object({
                success: z.boolean().default(false),
                error: z
                  .object({
                    issues: z.array(
                      z.object({
                        message: z.string(),
                      }),
                    ),
                  })
                  .optional(),
              }),
            },
          },
          description: 'Bad request - invalid IP format from Zod Validator',
        },
      },
    });

    app.openapi(getAddressRoute, async (c) => {
      const { address } = c.req.valid('param');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _global = globalThis as unknown as { caches?: { default: any } };
      const cache = typeof _global.caches !== 'undefined' ? _global.caches.default : undefined;
      const cacheUrl = new URL(c.req.url);
      const cacheKey = new Request(cacheUrl.toString(), c.req.raw);

      if (cache) {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          // Need to clone otherwise we consume the cached response body
          return cachedResponse.clone();
        }
      }

      const data = await this.getInsight(c, address);
      const response = await ContentNegotiator.formatResponse(c, data, {
        cacheControl: 'public, max-age=3600',
      });

      if (cache && c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    });
  }

  private async getInsight(c: Context, ip: string): Promise<Insight> {
    const headers = c.req.header();
    const service = c.get('insightService');
    return service.get(ip, headers);
  }
}
