import { BinaryCodec } from '#core/entities/codec';
import { BloomFilter } from '#core/entities/bloom-filter';
import { IPUtils } from '#core/utils/ip-utils';
import { logger } from '#infra/logger/logger';

export interface BinaryIdentityResult {
  type: 'identity';
  slug?: string;
  service?: string;
  region?: string;
}

export interface BinaryReputationResult {
  type: 'reputation';
  category?: string;
}

export interface BinaryWhoisResult {
  registry?: string;
  country?: string;
  allocated?: string;
  status?: string;
}

export interface InsightResult {
  identity?: BinaryIdentityResult;
  reputation?: BinaryReputationResult;
  whois?: BinaryWhoisResult;
}

export interface IIntelligenceAdapter {
  init(buffer: Uint8Array): Promise<void>;
  lookup(ip: string): InsightResult;
}

export class BinaryAdapter implements IIntelligenceAdapter {
  private startIps: Uint32Array = new Uint32Array(0);
  private endIps: Uint32Array = new Uint32Array(0);
  private metaIndices: Uint16Array = new Uint16Array(0);

  // IPv6 Arrays (High/Low pairs)
  private startIpsV6: BigUint64Array = new BigUint64Array(0);
  private endIpsV6: BigUint64Array = new BigUint64Array(0);
  private metaIndicesV6: Uint16Array = new Uint16Array(0);

  private metadataList: Record<string, unknown>[] = [];
  private bloom?: BloomFilter;
  private initialized = false;

  constructor() {}

  async init(buffer: Uint8Array): Promise<void> {
    if (this.initialized) return;

    try {
      const startTime = performance.now();
      // Decode buffer into high-performance TypedArrays
      const decoded = BinaryCodec.decode(buffer);

      this.bloom = decoded.bloom;
      this.startIps = decoded.startIps;
      this.endIps = decoded.endIps;
      this.metaIndices = decoded.metaIndices;

      this.startIpsV6 = decoded.startIpsV6;
      this.endIpsV6 = decoded.endIpsV6;
      this.metaIndicesV6 = decoded.metaIndicesV6;

      this.metadataList = decoded.metadataList;

      this.initialized = true;
      const duration = (performance.now() - startTime).toFixed(2);
      logger.info(
        `[BinaryAdapter] Loaded ${this.startIps.length} V4 ranges + ${this.startIpsV6.length / 2} V6 ranges + Bloom Filter (Zero-Copy) in ${duration}ms`,
      );
    } catch (e: unknown) {
      logger.error(
        '[BinaryAdapter] Failed to load binary data',
        e instanceof Error ? e : new Error(String(e)),
      );
    }
  }

  lookup(ip: string): InsightResult {
    if (!this.initialized) return {};

    const result: InsightResult = {};

    // 1. Try IPv4
    const numericIp = IPUtils.ipToUint32(ip);
    if (numericIp !== null) {
      this.lookupV4(Number(numericIp), result);
    } else {
      // 2. Try IPv6
      const bigIp = IPUtils.ipv6ToBigInt(ip);
      if (bigIp !== null) {
        this.lookupV6(bigIp, result);
      }
    }

    // 3. Check Bloom Filter (Proxies) - typically mostly V4 but can support others if added
    if (this.bloom && this.bloom.has(ip)) {
      if (!result.reputation) {
        result.reputation = {
          type: 'reputation',
          category: 'firehol_proxies',
        };
      }
    }

    return result;
  }

  private lookupV4(ipNum: number, result: InsightResult) {
    let low = 0;
    let high = this.startIps.length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;

      if (ipNum >= this.startIps[mid] && ipNum <= this.endIps[mid]) {
        const match = this.metadataList[this.metaIndices[mid]];
        this.assignResult(match, result);
        break;
      }

      if (ipNum < this.startIps[mid]) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
  }

  private lookupV6(ipBig: bigint, result: InsightResult) {
    let low = 0;
    let high = this.startIpsV6.length / 2 - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midIdx = mid * 2;

      // Reconstruct BigInts from High/Low pairs
      const startHigh = this.startIpsV6[midIdx];
      const startLow = this.startIpsV6[midIdx + 1];
      const startVal = (startHigh << 64n) | startLow;

      const endHigh = this.endIpsV6[midIdx];
      const endLow = this.endIpsV6[midIdx + 1];
      const endVal = (endHigh << 64n) | endLow;

      if (ipBig >= startVal && ipBig <= endVal) {
        const match = this.metadataList[this.metaIndicesV6[mid]];
        this.assignResult(match, result);
        break;
      }

      if (ipBig < startVal) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
  }

  private assignResult(match: Record<string, unknown>, result: InsightResult) {
    if (match.identity) {
      result.identity = match.identity as BinaryIdentityResult;
    }
    if (match.reputation) {
      result.reputation = match.reputation as BinaryReputationResult;
    }
    if (match.whois) {
      result.whois = match.whois as BinaryWhoisResult;
    }
  }
}
