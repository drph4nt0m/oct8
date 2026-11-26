import { describe, it, expect, vi, Mock } from 'vitest';
import { requestId } from '#api/http/middleware/request-id';
import { Context } from 'hono';
import { MockContext } from '#tests/test-types';

// Mock context.ts
vi.mock('#infra/context/context.js', () => ({
  runWithContext: vi.fn((ctx, fn) => fn()),
}));

describe('requestId Middleware', () => {
  it('should use traceparent ID if present', async () => {
    const middleware = requestId();
    const next = vi.fn();
    const c: MockContext = {
      req: {
        header: vi.fn((name: string) => {
          if (name === 'traceparent')
            return '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
          return undefined;
        }) as unknown as Context['req']['header'],
      },
      set: vi.fn(),
      header: vi.fn(),
    };

    await middleware(c as Context, next);

    expect(c.set).toHaveBeenCalledWith('requestId', '4bf92f3577b34da6a3ce929d0e0e4736');
    expect(next).toHaveBeenCalled();
  });

  it('should use cf-ray ID if traceparent is missing', async () => {
    const middleware = requestId();
    const next = vi.fn();
    const c: MockContext = {
      req: {
        header: vi.fn((name: string) => {
          if (name === 'cf-ray') return 'ray-12345';
          return undefined;
        }) as unknown as Context['req']['header'],
      },
      set: vi.fn(),
      header: vi.fn(),
    };

    await middleware(c as Context, next);

    expect(c.set).toHaveBeenCalledWith('requestId', 'ray-12345');
  });

  it('should generate UUID if headers are missing', async () => {
    const middleware = requestId();
    const next = vi.fn();
    const c: MockContext = {
      req: {
        header: vi.fn(() => undefined) as unknown as Context['req']['header'],
      },
      set: vi.fn(),
      header: vi.fn(),
    };

    await middleware(c as Context, next);

    expect(c.set).toHaveBeenCalled();
    const calls = (c.set as Mock).mock.calls;
    expect(calls[0][0]).toBe('requestId');
    expect(calls[0][1]).toHaveLength(36); // UUID length
  });
});
