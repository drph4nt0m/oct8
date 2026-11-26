import { describe, it, expect, vi } from 'vitest';
import { BinaryProvider } from '#infra/providers/binary-provider';
import { BinaryAdapter } from '#infra/adapters/intelligence-adapter';
import { MockBinaryAdapter } from '#tests/test-types';

describe('BinaryProvider', () => {
  it('should map internal identity type "identity" to "datacenter"', async () => {
    // Mock Adapter
    const mockAdapter: MockBinaryAdapter = {
      init: vi.fn(),
      lookup: vi.fn().mockReturnValue({
        identity: {
          type: 'identity',
          slug: 'aws',
          service: 'EC2',
          region: 'us-east-1',
        },
      }),
    };

    // Cast to real adapter for injection
    const provider = new BinaryProvider(mockAdapter as BinaryAdapter);
    const result = await provider.get('1.2.3.4');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.identity?.type).toBe('datacenter');
      expect(result.value.identity?.provider?.slug).toBe('aws');
    }
  });

  it('should keep other identity types as is', async () => {
    // Mock Adapter
    const mockAdapter: MockBinaryAdapter = {
      init: vi.fn(),
      lookup: vi.fn().mockReturnValue({
        identity: {
          type: 'residential',
          slug: 'comcast',
        },
      }),
    };

    const provider = new BinaryProvider(mockAdapter as BinaryAdapter);
    const result = await provider.get('1.2.3.4');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.identity?.type).toBe('residential');
    }
  });

  it('should set anonymity flags correctly for Tor exit nodes (IPv4/IPv6)', async () => {
    // Mock Adapter
    const mockAdapter: MockBinaryAdapter = {
      init: vi.fn(),
      lookup: vi.fn().mockReturnValue({
        reputation: {
          category: 'tor_exits',
        },
      }),
    };

    const provider = new BinaryProvider(mockAdapter as BinaryAdapter);

    // Test with an IPv6 address
    const result = await provider.get('2001:67c:89c:702:1ce:1ce:babe:1');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.security?.is_anonymous).toBe(true);
      expect(result.value.security?.is_tor).toBe(true);
      expect(result.value.security?.is_proxy).toBe(false);
      expect(result.value.security?.is_vpn).toBe(false);

      expect(result.value.security?.is_threat).toBe(true);
      expect(result.value.security?.sources?.[0].category).toBe('reputation');
      expect(result.value.security?.sources?.[0].slug).toBe('tor_exits');
    }
  });
});
