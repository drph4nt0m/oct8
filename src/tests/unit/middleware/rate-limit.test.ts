import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Context, Next } from 'hono';

// Reset module state between tests so the isolate-scoped Maps start fresh
vi.mock('#api/http/middleware/ip-extractor', () => ({
  IpExtractor: { getClientIp: vi.fn().mockReturnValue('1.2.3.4') },
}));

function mockContext(): Context {
  return {
    req: { header: vi.fn() },
    status: vi.fn(),
    text: vi.fn().mockReturnValue(new Response('Too many requests', { status: 429 })),
  } as unknown as Context;
}

const mockNext: Next = vi.fn().mockResolvedValue(undefined);

describe('rateLimit middleware', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules(); // Reset module-level Maps between tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request through', async () => {
    const { rateLimit } = await import('#api/http/middleware/rate-limit');
    const middleware = rateLimit({ max: 5, windowMs: 60_000 });
    const c = mockContext();
    await middleware(c, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('allows requests up to the limit', async () => {
    const { rateLimit } = await import('#api/http/middleware/rate-limit');
    const middleware = rateLimit({ max: 3, windowMs: 60_000 });
    const c = mockContext();
    for (let i = 0; i < 3; i++) {
      await middleware(c, mockNext);
    }
    expect(mockNext).toHaveBeenCalledTimes(3);
  });

  it('returns 429 once requests exceed the limit', async () => {
    const { rateLimit } = await import('#api/http/middleware/rate-limit');
    const middleware = rateLimit({ max: 2, windowMs: 60_000 });
    const c = mockContext();
    await middleware(c, mockNext);
    await middleware(c, mockNext);
    // 3rd request should be blocked
    await middleware(c, mockNext);
    expect(c.status).toHaveBeenCalledWith(429);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('resets the window after windowMs elapses and allows requests again', async () => {
    const { rateLimit } = await import('#api/http/middleware/rate-limit');
    const middleware = rateLimit({ max: 1, windowMs: 1_000 });
    const c = mockContext();
    await middleware(c, mockNext); // 1st — allowed
    await middleware(c, mockNext); // 2nd — blocked
    expect(mockNext).toHaveBeenCalledTimes(1);

    // Advance time past the window
    vi.advanceTimersByTime(2_000);

    await middleware(c, mockNext); // Should be allowed again
    expect(mockNext).toHaveBeenCalledTimes(2);
  });
});
