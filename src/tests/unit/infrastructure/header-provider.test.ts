import { describe, it, expect } from 'vitest';
import { HeaderAdapter } from '#infra/adapters/GeoAdapter';
import { HeaderProvider } from '#infra/providers/header-provider';

describe('HeaderAdapter', () => {
  const adapter = new HeaderAdapter();

  it('returns null when headers are not provided', async () => {
    const result = await adapter.lookup('1.2.3.4', undefined);
    expect(result).toBeNull();
  });

  it('returns null when cf-connecting-ip does not match the requested IP (security check)', async () => {
    // Client is 1.2.3.4 but caller is looking up 8.8.8.8 — must not return client's geo data
    const result = await adapter.lookup('8.8.8.8', {
      'cf-connecting-ip': '1.2.3.4',
      'cf-ipcountry': 'US',
    });
    expect(result).toBeNull();
  });

  it('returns null when cf-connecting-ip matches but cf-ipcountry is absent', async () => {
    const result = await adapter.lookup('1.2.3.4', {
      'cf-connecting-ip': '1.2.3.4',
    });
    expect(result).toBeNull();
  });

  it('returns country_code when cf-connecting-ip matches and cf-ipcountry is present', async () => {
    const result = await adapter.lookup('1.2.3.4', {
      'cf-connecting-ip': '1.2.3.4',
      'cf-ipcountry': 'DE',
    });
    expect(result).not.toBeNull();
    expect(result?.country_code).toBe('DE');
  });
});

describe('HeaderProvider', () => {
  const adapter = new HeaderAdapter();
  const provider = new HeaderProvider(adapter);

  it('returns MISSING_HEADERS error when no headers passed', async () => {
    const result = await provider.get('1.2.3.4', undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('MISSING_HEADERS');
  });

  it('returns NOT_FOUND when the adapter returns null (IP mismatch or no country header)', async () => {
    const result = await provider.get('8.8.8.8', {
      'cf-connecting-ip': '1.2.3.4', // mismatch
      'cf-ipcountry': 'US',
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns ok with location data when adapter resolves successfully', async () => {
    const result = await provider.get('1.2.3.4', {
      'cf-connecting-ip': '1.2.3.4',
      'cf-ipcountry': 'JP',
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ip).toBe('1.2.3.4');
      expect(result.value.location?.country_code).toBe('JP');
    }
  });
});
