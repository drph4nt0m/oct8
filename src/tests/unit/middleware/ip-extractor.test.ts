import { describe, it, expect } from 'vitest';
import { IpExtractor } from '#api/http/middleware/ip-extractor';
import { Context } from 'hono';

/** Build a minimal mock Context with the given header map */
function mockContext(headers: Record<string, string | undefined>): Context {
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
    },
  } as unknown as Context;
}

describe('IpExtractor.getClientIp', () => {
  it('returns cf-connecting-ip when present (highest priority)', () => {
    const c = mockContext({
      'cf-connecting-ip': '203.0.113.1',
      'x-forwarded-for': '10.0.0.1',
    });
    expect(IpExtractor.getClientIp(c)).toBe('203.0.113.1');
  });

  it('parses the IP from RFC 7239 Forwarded header when cf header is absent', () => {
    const c = mockContext({
      forwarded: 'for="203.0.113.2";proto=https',
    });
    expect(IpExtractor.getClientIp(c)).toBe('203.0.113.2');
  });

  it('returns the leftmost (client) IP from x-forwarded-for when higher-priority headers absent', () => {
    const c = mockContext({
      'x-forwarded-for': '203.0.113.3, 10.0.0.1, 172.16.0.1',
    });
    expect(IpExtractor.getClientIp(c)).toBe('203.0.113.3');
  });

  it('returns x-real-ip when only that header is present', () => {
    const c = mockContext({ 'x-real-ip': '203.0.113.4' });
    expect(IpExtractor.getClientIp(c)).toBe('203.0.113.4');
  });

  it('falls back to 127.0.0.1 when all headers are absent', () => {
    const c = mockContext({});
    expect(IpExtractor.getClientIp(c)).toBe('127.0.0.1');
  });
});
