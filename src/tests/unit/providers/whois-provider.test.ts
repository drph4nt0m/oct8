import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhoisProvider } from '#infra/providers/whois-provider';
import { logger } from '#infra/logger/logger';

describe('WhoisProvider', () => {
  let provider: WhoisProvider;

  beforeEach(() => {
    provider = new WhoisProvider();
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('should initialize with empty data and return NOT_FOUND', async () => {
    await provider.init(undefined);
    const result = await provider.get('8.8.8.8');
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe('NOT_FOUND');
  });

  it('should parse valid whois JSON buffer and return data for matched IP', async () => {
    const mockData = {
      '8.8.8.0/24': {
        registry: 'arin',
        country: 'US',
        allocated: '19921201',
        status: 'allocated',
      },
    };

    const buffer = new TextEncoder().encode(JSON.stringify(mockData));
    await provider.init(buffer);

    // Exact match in range
    const res1 = await provider.get('8.8.8.8');
    expect(res1.isOk()).toBe(true);
    if (res1.isOk()) {
      expect(res1.value.infrastructure).toEqual(mockData['8.8.8.0/24']);
    }

    // Match at boundaries
    const res2 = await provider.get('8.8.8.0');
    expect(res2.isOk()).toBe(true);

    const res3 = await provider.get('8.8.8.255');
    expect(res3.isOk()).toBe(true);

    // Out of range
    const res4 = await provider.get('8.8.9.1');
    expect(res4.isErr()).toBe(true);
  });

  it('should handle malformed JSON buffer gracefully', async () => {
    const buffer = new TextEncoder().encode('invalid-json');
    await provider.init(buffer);

    expect(logger.error).toHaveBeenCalled();
    const result = await provider.get('8.8.8.8');
    expect(result.isErr()).toBe(true);
  });
});
