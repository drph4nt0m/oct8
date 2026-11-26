import { describe, it, expect } from 'vitest';
import { IPUtils } from '#core/utils/ip-utils';

describe('ipToReverseDomain', () => {
  it('should correctly reverse IPv4 addresses', () => {
    expect(IPUtils.ipToReverseDomain('8.8.8.8')).toBe('8.8.8.8.in-addr.arpa');
    expect(IPUtils.ipToReverseDomain('192.168.1.1')).toBe('1.1.168.192.in-addr.arpa');
    expect(IPUtils.ipToReverseDomain('10.0.0.5')).toBe('5.0.0.10.in-addr.arpa');
  });

  it('should correctly reverse IPv6 addresses', () => {
    // Standard full address
    expect(IPUtils.ipToReverseDomain('2001:0db8:0000:0000:0000:ff00:0042:8329')).toBe(
      '9.2.3.8.2.4.0.0.0.0.f.f.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa',
    );
    // Address with zero compression
    expect(IPUtils.ipToReverseDomain('2001:db8::ff00:42:8329')).toBe(
      '9.2.3.8.2.4.0.0.0.0.f.f.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa',
    );
    // Localhost IPv6
    expect(IPUtils.ipToReverseDomain('::1')).toBe(
      '1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa',
    );
  });

  it('should return null for invalid IPs', () => {
    expect(IPUtils.ipToReverseDomain('invalid-ip')).toBeNull();
    expect(IPUtils.ipToReverseDomain('256.256.256.256')).toBeNull();
    expect(IPUtils.ipToReverseDomain(':::')).toBeNull();
  });
});
