import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaxMindProvider } from '#infra/providers/maxmind';
import { MockLogger } from '#tests/test-types';

// Mock the maxmind library so we do not need actual .mmdb binary files.
// Reader must be mockable as a class constructor.
vi.mock('maxmind', () => {
  const ReaderMock = vi.fn().mockImplementation(function () {
    return { get: vi.fn().mockReturnValue(null) };
  });
  return { Reader: ReaderMock };
});

describe('MaxMindProvider', () => {
  let mockLogger: MockLogger;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-apply the default working implementation after clearAllMocks
    const { Reader } = await import('maxmind');
    (Reader as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return { get: vi.fn().mockReturnValue(null) };
    });

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };
  });

  it('logs warnings when no buffers are provided to init()', async () => {
    const provider = new MaxMindProvider(mockLogger as never);
    await provider.init(undefined, undefined);
    expect(mockLogger.warn).toHaveBeenCalledWith('MaxMind City DB data not provided');
    expect(mockLogger.warn).toHaveBeenCalledWith('MaxMind ASN DB data not provided');
  });

  it('returns NOT_FOUND when both readers are null (no data loaded)', async () => {
    const provider = new MaxMindProvider();
    // Do not call init — readers remain null
    const result = await provider.get('1.2.3.4');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns PROVIDER_ERROR when a reader throws during lookup', async () => {
    const { Reader } = await import('maxmind');
    // Override to return a reader that throws on get()
    (Reader as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        get: vi.fn().mockImplementation(() => {
          throw new Error('mmdb read failure');
        }),
      };
    });

    const provider = new MaxMindProvider(mockLogger as never);
    await provider.init(new Uint8Array(10), undefined);

    const result = await provider.get('1.2.3.4');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('PROVIDER_ERROR');
      expect(result.error.message).toContain('mmdb read failure');
    }
  });
});
