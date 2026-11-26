import { describe, it, expect } from 'vitest';
import { IPUtils } from '#core/utils/ip-utils';

describe('IPUtils', () => {
  // --- ipToUint32 ---

  describe('ipToUint32', () => {
    it('converts a well-known IPv4 address to the correct bigint', () => {
      // 1.2.3.4 = 0x01020304 = 16909060
      expect(IPUtils.ipToUint32('1.2.3.4')).toBe(16909060n);
    });

    it('handles 0.0.0.0', () => {
      expect(IPUtils.ipToUint32('0.0.0.0')).toBe(0n);
    });

    it('handles 255.255.255.255', () => {
      expect(IPUtils.ipToUint32('255.255.255.255')).toBe(4294967295n);
    });

    it('returns null for an IPv6 string', () => {
      expect(IPUtils.ipToUint32('2001:db8::1')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(IPUtils.ipToUint32('')).toBeNull();
    });

    it('returns null for a non-IP string', () => {
      expect(IPUtils.ipToUint32('not.an.ip.address')).toBeNull();
    });
  });

  // --- uint32ToIp ---

  describe('uint32ToIp', () => {
    it('round-trips correctly with ipToUint32', () => {
      const ip = '192.168.10.55';
      const num = IPUtils.ipToUint32(ip);
      expect(IPUtils.uint32ToIp(Number(num))).toBe(ip);
    });

    it('converts 0 to 0.0.0.0', () => {
      expect(IPUtils.uint32ToIp(0)).toBe('0.0.0.0');
    });
  });

  // --- ipv6ToBigInt ---

  describe('ipv6ToBigInt', () => {
    it('converts loopback ::1 to 1n', () => {
      expect(IPUtils.ipv6ToBigInt('::1')).toBe(1n);
    });

    it('converts all-zeros :: to 0n', () => {
      expect(IPUtils.ipv6ToBigInt('::')).toBe(0n);
    });

    it('correctly expands :: with values on both sides', () => {
      // 2001:db8::1 = 2001:0db8:0000:0000:0000:0000:0000:0001
      const result = IPUtils.ipv6ToBigInt('2001:db8::1');
      expect(result).toBe(42540766411282592856903984951653826561n);
    });

    it('returns null for an empty string', () => {
      expect(IPUtils.ipv6ToBigInt('')).toBeNull();
    });

    it('returns null for a malformed address with wrong group count', () => {
      expect(IPUtils.ipv6ToBigInt('2001:db8:1')).toBeNull(); // only 3 groups, no ::
    });
  });

  // --- cidrToRange ---

  describe('cidrToRange', () => {
    it('computes correct start/end for an IPv4 /24', () => {
      const range = IPUtils.cidrToRange('192.168.1.0/24');
      expect(range.start).toBe('192.168.1.0');
      expect(range.end).toBe('192.168.1.255');
    });

    it('computes correct start/end for an IPv4 /32 (host route)', () => {
      const range = IPUtils.cidrToRange('10.0.0.1/32');
      expect(range.start).toBe('10.0.0.1');
      expect(range.end).toBe('10.0.0.1');
    });

    it('treats a bare IP (no slash) as a /32 host route', () => {
      const range = IPUtils.cidrToRange('8.8.8.8');
      expect(range.start).toBe('8.8.8.8');
      expect(range.end).toBe('8.8.8.8');
    });

    it('computes correct start/end for an IPv6 /32', () => {
      const range = IPUtils.cidrToRange('2001:db8::/32');
      // bigIntToIpv6 returns expanded (non-compressed) form
      expect(range.start).toBe('2001:db8:0:0:0:0:0:0');
      expect(range.end).toContain('2001:db8:');
    });
  });

  // --- ipV4ToBinaryString ---

  describe('ipV4ToBinaryString', () => {
    it('converts 10.0.0.1 to correct 32-bit binary string', () => {
      const result = IPUtils.ipV4ToBinaryString('10.0.0.1');
      expect(result).toHaveLength(32);
      expect(result).toBe('00001010000000000000000000000001');
    });
  });
});
