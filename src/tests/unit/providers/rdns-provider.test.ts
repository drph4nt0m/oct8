import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReverseDnsProvider } from '#infra/providers/rdns-provider';

describe('ReverseDnsProvider', () => {
  let provider: ReverseDnsProvider;

  beforeEach(() => {
    provider = new ReverseDnsProvider();
    globalThis.fetch = vi.fn();
  });

  it('should return NOT_FOUND if IP is invalid', async () => {
    const result = await provider.get('invalid-ip');
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe('INVALID_IP');
  });

  it('should fetch and return reverse DNS for valid IPv4', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Answer: [{ data: 'dns.google.' }],
      }),
    } as Response);

    const result = await provider.get('8.8.8.8');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://1.1.1.1/dns-query?name=8.8.8.8.in-addr.arpa&type=PTR',
      expect.objectContaining({ headers: { accept: 'application/dns-json' } }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.infrastructure?.reverse_dns).toBe('dns.google'); // Note the trimmed dot
    }
  });

  it('should return NOT_FOUND if DoH returns no answer', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // No Answer array
    } as Response);

    const result = await provider.get('8.8.8.8');
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe('NOT_FOUND');
  });

  it('should return PROVIDER_ERROR if fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await provider.get('8.8.8.8');
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe('PROVIDER_ERROR');
  });
});
