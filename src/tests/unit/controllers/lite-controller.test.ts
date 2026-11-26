import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { AppEnv } from '#api/http/app-types';
import { LiteController } from '#api/http/controllers/lite-controller';
import { CachedInsightService } from '#services/cached-insight-service';

describe('LiteController', () => {
  let app: OpenAPIHono<AppEnv>;
  let mockInsightService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    app = new OpenAPIHono<AppEnv>();
    mockInsightService = {
      get: vi.fn(),
    };

    app.use('*', async (c, next) => {
      c.set('insightService', mockInsightService as unknown as CachedInsightService);
      await next();
    });

    const controller = new LiteController();
    controller.registerRoutes(app);
  });

  it('should return country field successfully', async () => {
    mockInsightService.get.mockResolvedValueOnce({
      ip: '8.8.8.8',
      location: { country_code: 'US' },
    });

    const res = await app.request('/8.8.8.8/country');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(await res.text()).toBe('US');
  });

  it('should return 404 if field is missing', async () => {
    mockInsightService.get.mockResolvedValueOnce({
      ip: '8.8.8.8',
      location: {}, // no country_code
    });

    const res = await app.request('/8.8.8.8/country');
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid IP address format', async () => {
    const res = await app.request('/invalid-ip/country');
    expect(res.status).toBe(400);
  });

  it('should set appropriate cache headers', async () => {
    mockInsightService.get.mockResolvedValueOnce({
      ip: '8.8.8.8',
      infrastructure: { asn: 15169 },
    });

    const res = await app.request('/8.8.8.8/asn');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(await res.text()).toBe('15169');
  });
});
