import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { CircuitBreakerProvider } from '#infra/providers/circuit-breaker-provider';
import { Result } from '#core/result';
import { InsightProvider } from '#core/entities/types';
import { Logger } from '#infra/logger/logger';
import { MockInsightProvider, MockLogger } from '#tests/test-types';

describe('CircuitBreakerProvider', () => {
  let mockInner: MockInsightProvider;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockInner = {
      name: 'MockProvider',
      init: vi.fn(),
      get: vi.fn(),
    };
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };
  });

  it('should pass through successful requests', async () => {
    (mockInner.get as Mock).mockResolvedValue(Result.ok({ ip: '1.2.3.4' }));
    const cb = new CircuitBreakerProvider(mockInner as InsightProvider, mockLogger as Logger);

    const result = await cb.get('1.2.3.4');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ ip: '1.2.3.4' });
    }
    expect(mockInner.get).toHaveBeenCalledWith('1.2.3.4', undefined);
  });

  it('should timeout slow requests', async () => {
    (mockInner.get as Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    // Timeout set to 100ms
    const cb = new CircuitBreakerProvider(mockInner as InsightProvider, mockLogger as Logger, {
      timeoutMs: 100,
    });

    const result = await cb.get('1.2.3.4');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Operation timed out');
    }
    // Timeout error is logged by CB
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Operation timed out after 100ms'),
    );
  });

  it('should open circuit after threshold failures', async () => {
    (mockInner.get as Mock).mockResolvedValue(Result.err(new Error('Boom')));
    // Threshold 2
    const cb = new CircuitBreakerProvider(mockInner as InsightProvider, mockLogger as Logger, {
      failureThreshold: 2,
    });

    // 1st failure
    await cb.get('1.2.3.4');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    // 2nd failure - Should Open
    await cb.get('1.2.3.4');
    expect(mockLogger.error).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('transitioned to OPEN'));

    // 3rd attempt - Should fail fast without calling inner
    vi.clearAllMocks();
    const result = await cb.get('1.2.3.4');
    expect(mockInner.get).not.toHaveBeenCalled();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('CIRCUIT_OPEN');
    }
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('is OPEN. Skipping'));
  });

  it('should transition to half-open after reset timeout', async () => {
    vi.useFakeTimers();
    (mockInner.get as Mock).mockResolvedValue(Result.err(new Error('Boom')));

    const cb = new CircuitBreakerProvider(mockInner as InsightProvider, mockLogger as Logger, {
      failureThreshold: 1,
      resetTimeoutMs: 1000,
    });

    // 1st failure -> OPEN
    await cb.get('1.2.3.4');
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('transitioned to OPEN'));

    // Advance time past reset timeout
    vi.advanceTimersByTime(1500);

    // Next call should be allowed (HALF-OPEN probe)
    (mockInner.get as Mock).mockResolvedValue(Result.ok({ ip: '1.2.3.4' }));
    vi.clearAllMocks();

    const result = await cb.get('1.2.3.4');
    expect(mockInner.get).toHaveBeenCalled();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ ip: '1.2.3.4' });
    }

    // Should close on success
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('transitioned to CLOSED'));

    vi.useRealTimers();
  });
});
