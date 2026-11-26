import { InsightError } from '#core/result';
import { Address4, Address6 } from 'ip-address';

export class IPUtils {
  // --- IPv4 Helpers ---

  static ipToUint32(ip: string): bigint | null {
    if (!ip || !ip.includes('.')) return null;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    return (
      (BigInt(parts[0]) << 24n) +
      (BigInt(parts[1]) << 16n) +
      (BigInt(parts[2]) << 8n) +
      BigInt(parts[3])
    );
  }

  static uint32ToIp(int: number): string {
    const u = int >>> 0;
    return `${(u >>> 24) & 255}.${(u >>> 16) & 255}.${(u >>> 8) & 255}.${u & 255}`;
  }

  static ipV4ToBinaryString(ip: string): string {
    const parts = ip.split('.');
    if (parts.length !== 4) throw new InsightError('IP_INVALID_V4', 'Invalid IPv4');

    let binary = '';
    for (let i = 0; i < 4; i++) {
      let bin = parseInt(parts[i], 10).toString(2);
      while (bin.length < 8) bin = '0' + bin;
      binary += bin;
    }
    return binary;
  }

  // --- IPv6 Helpers ---

  static ipv6ToBigInt(ip: string): bigint | null {
    try {
      if (!ip) return null;
      // Simple parser for standard IPv6 representation
      // Expand ::
      let parts: string[] = [];
      if (ip.includes('::')) {
        const [left, right] = ip.split('::');
        const lParts = left ? left.split(':') : [];
        const rParts = right ? right.split(':') : [];
        const missing = 8 - (lParts.length + rParts.length);
        parts = [...lParts, ...Array(missing).fill('0'), ...rParts];
      } else {
        parts = ip.split(':');
      }

      if (parts.length !== 8) return null;

      let result = 0n;
      for (const part of parts) {
        result = (result << 16n) + BigInt(parseInt(part || '0', 16));
      }
      return result;
    } catch {
      return null;
    }
  }

  static bigIntToIpv6(num: bigint): string {
    const parts: string[] = [];
    for (let i = 0; i < 8; i++) {
      const shift = BigInt((7 - i) * 16);
      parts.push(((num >> shift) & 0xffffn).toString(16));
    }
    return parts.join(':');
  }

  static ipV6ToBinaryString(ip: string): string {
    let fullIp = ip;
    if (ip.includes('::')) {
      const [left, right] = ip.split('::');
      const leftParts = left ? left.split(':') : [];
      const rightParts = right ? right.split(':') : [];
      const missing = 8 - (leftParts.length + rightParts.length);
      const zeros = new Array(missing).fill('0');
      fullIp = [...leftParts, ...zeros, ...rightParts].join(':');
    }

    const parts = fullIp.split(':');
    let binary = '';
    for (const part of parts) {
      if (!part) continue;
      let bin = parseInt(part, 16).toString(2);
      while (bin.length < 16) bin = '0' + bin;
      binary += bin;
    }
    return binary;
  }

  static cidrToRange(cidr: string): { start: string; end: string } {
    try {
      if (!cidr.includes('/')) return { start: cidr, end: cidr };

      const [ip, maskStr] = cidr.split('/');
      const mask = parseInt(maskStr, 10);

      const isV6 = ip.includes(':');
      if (isNaN(mask) || mask < 0 || (isV6 ? mask > 128 : mask > 32)) {
        return { start: isV6 ? '::' : '0.0.0.0', end: isV6 ? '::' : '0.0.0.0' };
      }

      if (isV6) {
        const ipBig = this.ipv6ToBigInt(ip);
        if (ipBig === null) return { start: '::', end: '::' };

        const hostBits = 128n - BigInt(mask);
        // mask: 111...000
        const networkMask = (0xffff_ffff_ffff_ffff_ffff_ffff_ffff_ffffn >> hostBits) << hostBits;

        const startBig = ipBig & networkMask;
        const endBig = startBig | ((1n << hostBits) - 1n);

        return {
          start: this.bigIntToIpv6(startBig),
          end: this.bigIntToIpv6(endBig),
        };
      } else {
        const ipBig = this.ipToUint32(ip);
        if (ipBig === null) return { start: '0.0.0.0', end: '0.0.0.0' };

        const hostBits = 32n - BigInt(mask);
        const networkMask = (0xffffffffn >> hostBits) << hostBits;

        const startBig = ipBig & networkMask;
        const endBig = startBig | ((1n << hostBits) - 1n);

        return {
          start: this.uint32ToIp(Number(startBig)),
          end: this.uint32ToIp(Number(endBig)),
        };
      }
    } catch {
      return { start: '0.0.0.0', end: '0.0.0.0' };
    }
  }

  static ipToReverseDomain(ip: string): string | null {
    try {
      if (ip.includes(':')) {
        if (!Address6.isValid(ip)) return null;
        const address = new Address6(ip);
        // Address6.parsedAddress is an array of 8 segments, each a hex string
        // To get the reverse domain, we need all 32 nibbles reversed.
        const expanded = address.canonicalForm();
        const hexString = expanded.replace(/:/g, '');
        const nibbles = hexString.split('');
        return nibbles.reverse().join('.') + '.ip6.arpa';
      } else {
        if (!Address4.isValid(ip)) return null;
        const address = new Address4(ip);
        return address.toArray().reverse().join('.') + '.in-addr.arpa';
      }
    } catch {
      return null;
    }
  }
}
