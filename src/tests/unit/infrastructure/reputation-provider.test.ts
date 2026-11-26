import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReputationProvider } from '#infra/providers/reputation';

// Helper: encode a JS object as a UTF-8 Uint8Array (mimics WorkerDataSource output)
function toBuffer(data: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data));
}

describe('ReputationProvider', () => {
  let provider: ReputationProvider;

  beforeEach(() => {
    provider = new ReputationProvider();
  });

  // --- init() ---

  it('warns and returns early when no buffer is provided', async () => {
    const warnSpy = vi.spyOn(console, 'log'); // JsonLogger uses console.log
    await provider.init(undefined);
    // Should not throw; provider simply logs a warning and stays empty
    const result = await provider.get('1.2.3.4');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
    warnSpy.mockRestore();
  });

  it('loads entries from a valid buffer and logs the count', async () => {
    const logSpy = vi.spyOn(console, 'log');
    const data = { tor_exits: ['10.0.0.1', '10.0.0.2'] };
    await provider.init(toBuffer(data));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
    logSpy.mockRestore();
  });

  it('catches and logs errors for malformed JSON without throwing', async () => {
    const errSpy = vi.spyOn(console, 'log');
    const badBuffer = new TextEncoder().encode('not valid json {{{');
    await expect(provider.init(badBuffer)).resolves.not.toThrow();
    errSpy.mockRestore();
  });

  it('skips non-array ip values gracefully (validates F3a runtime guard)', async () => {
    // "firehol_level1" value is a string, not an array — should be skipped
    const data = { tor_exits: ['1.2.3.4'], firehol_level1: 'not-an-array' };
    await expect(provider.init(toBuffer(data))).resolves.not.toThrow();
    // Only the tor_exits entry should have loaded
    const result = await provider.get('1.2.3.4');
    expect(result.isOk()).toBe(true);
  });

  // --- get() ---

  it('returns NOT_FOUND for an IP not in any list', async () => {
    await provider.init(toBuffer({ tor_exits: ['1.2.3.4'] }));
    const result = await provider.get('9.9.9.9');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('marks a Tor exit IP with is_tor=true and is_anonymous=true', async () => {
    await provider.init(toBuffer({ tor_exits: ['10.0.0.1'] }));
    const result = await provider.get('10.0.0.1');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.security?.is_tor).toBe(true);
      expect(result.value.security?.is_anonymous).toBe(true);
      expect(result.value.security?.is_proxy).toBe(false);
    }
  });

  it('marks a proxy IP with is_proxy=true and is_anonymous=true', async () => {
    await provider.init(toBuffer({ firehol_proxies: ['10.0.0.2'] }));
    const result = await provider.get('10.0.0.2');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.security?.is_proxy).toBe(true);
      expect(result.value.security?.is_anonymous).toBe(true);
      expect(result.value.security?.is_tor).toBe(false);
    }
  });

  it('marks a FireHOL Level 1 IP with is_threat=true and correct source', async () => {
    await provider.init(toBuffer({ firehol_level1: ['10.0.0.3'] }));
    const result = await provider.get('10.0.0.3');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.security?.is_threat).toBe(true);
      expect(result.value.security?.sources).toHaveLength(1);
      expect(result.value.security?.sources?.[0].slug).toBe('firehol_level1');
      expect(result.value.security?.sources?.[0].category).toBe('blocklist');
    }
  });

  it('merges flags correctly for an IP appearing in both tor_exits and firehol_level1', async () => {
    const ip = '10.0.0.4';
    await provider.init(toBuffer({ tor_exits: [ip], firehol_level1: [ip] }));
    const result = await provider.get(ip);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.security?.is_tor).toBe(true);
      expect(result.value.security?.is_anonymous).toBe(true);
      expect(result.value.security?.is_threat).toBe(true);
      expect(result.value.security?.sources).toHaveLength(1); // only firehol_level1 is threat type
    }
  });

  it('returns the correct ip field in the result', async () => {
    const ip = '192.168.0.1';
    await provider.init(toBuffer({ tor_exits: [ip] }));
    const result = await provider.get(ip);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.ip).toBe(ip);
  });
});
