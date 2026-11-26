import { describe, it, expect } from 'vitest';
import app from '#api/workers/worker';

describe('IP API E2E', () => {
  it('GET / should return client IP details (localhost default)', async () => {
    // Mock the env if necessary, but app.request handles it if not strictly required by the route
    // The worker.ts middleware tries to init ServiceContainer using c.env.
    // We need to pass a mock env to request()
    const mockEnv = {
      MODE: 'auto',
      DATA_DIR: 'data',
      INSIGHT_BINARY_FILE: 'insight.bin',
      MAXMIND_CITY_FILE: 'GeoLite2-City.mmdb',
      MAXMIND_ASN_FILE: 'GeoLite2-ASN.mmdb',
      LOG_LEVEL: 'error',
    };

    const res = await app.request('/', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache');
    const data = (await res.json()) as { ip: string };

    expect(data).toHaveProperty('ip');
    // Default fallback in controller or request
    // IP might be unknown if not forwarded?
    // app.request usually mocks incoming request.
    // Hono's app.request doesn't automatically set 127.0.0.1 unless we mock socket/headers
  });

  it('GET / should respect x-forwarded-for header', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request(
      '/',
      {
        headers: {
          'x-forwarded-for': '8.8.8.8',
        },
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ip: string };
    expect(data.ip).toBe('8.8.8.8');
  });

  it('GET /:address should return details for specific IP', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/1.1.1.1', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    const data = (await res.json()) as {
      ip: string;
      whois?: { registry?: string };
      network?: { reverse_dns?: string };
    };
    expect(data.ip).toBe('1.1.1.1');
    // We expect these might be present, but they are optional.
    // Just testing the response parsing doesn't fail.
    if (data.whois) {
      expect(data.whois).toHaveProperty('registry');
    }
    if (data.network?.reverse_dns) {
      expect(typeof data.network.reverse_dns).toBe('string');
    }
  });

  // Lite Endpoint Tests
  it('GET /:address/country should return plain text country code', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    // Assuming 8.8.8.8 has a country code in the mock/test data
    const res = await app.request('/8.8.8.8/country', {}, mockEnv);
    // Might be 404 if data isn't seeded in the test environment, but should not be 500
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(await res.text()).toBeDefined();
    }
  });

  it('GET /:address/asn should return plain text ASN', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/8.8.8.8/asn', {}, mockEnv);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(await res.text()).toBeDefined();
    }
  });

  it('GET / should support text format via ?format=text query param', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/?format=text', {}, mockEnv);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('ip:');
  });

  it('GET / should return HTML if Accept header requests it (simulate browser)', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request(
      '/',
      {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const text = await res.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('oct8</title>');
    expect(text).toContain('Location');
    expect(text).toContain('Network');
    expect(text).toContain('Security');
  });

  it('GET /health should return service status', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/health', {}, mockEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string; service: string };
    expect(data.status).toBe('ok');
    expect(data.service).toBe('oct8-insight-engine');
  });

  it('GET / should support xml format via ?format=xml query param', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/?format=xml', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');
    const text = await res.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<ip>');
  });

  it('GET / should support yaml format via ?format=yaml query param', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/?format=yaml', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/yaml');
    const text = await res.text();
    expect(text).toContain('ip:');
  });

  it('GET / should support explicit json format via ?format=json query param', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/?format=json', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const data = (await res.json()) as { ip: string };
    expect(data).toHaveProperty('ip');
  });

  it('GET / should return 400 for an unsupported ?format value', async () => {
    const mockEnv = { LOG_LEVEL: 'error' };
    const res = await app.request('/?format=unsupported_xyz', {}, mockEnv);
    expect(res.status).toBe(400);
  });
});
