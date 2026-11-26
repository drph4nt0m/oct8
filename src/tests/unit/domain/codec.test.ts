import { describe, it, expect } from 'vitest';
import { BinaryCodec } from '#core/entities/codec';
import { BloomFilter } from '#core/entities/bloom-filter';
import { IPUtils } from '#core/utils/ip-utils';
import { IPRange } from '#core/entities/types';

describe('BinaryCodec', () => {
  it('should encode with version 1', () => {
    const ranges: IPRange[] = [];
    const encoded = BinaryCodec.encode(ranges);
    // Header format: Magic(4) + Version(1)
    const view = new DataView(encoded.buffer);
    const version = view.getUint8(4);
    expect(version).toBe(1);
  });

  it('should encode and decode a simple range correctly', () => {
    const ranges: IPRange[] = [{ start: '192.168.1.0', end: '192.168.1.255', data: { id: 1 } }];

    const encoded = BinaryCodec.encode(ranges);
    const decoded = BinaryCodec.decode(encoded);

    expect(decoded.startIps).toHaveLength(1);
    expect(IPUtils.uint32ToIp(Number(decoded.startIps[0]))).toBe('192.168.1.0');
    expect(IPUtils.uint32ToIp(Number(decoded.endIps[0]))).toBe('192.168.1.255');
    expect(decoded.metadataList[decoded.metaIndices[0]]).toEqual({ id: 1 });
  });

  it('should handle multiple ranges', () => {
    const ranges: IPRange[] = [
      { start: '10.0.0.0', end: '10.0.0.255', data: { type: 'A' } },
      { start: '10.0.1.0', end: '10.0.1.255', data: { type: 'B' } },
    ];

    const encoded = BinaryCodec.encode(ranges);
    const decoded = BinaryCodec.decode(encoded);

    expect(decoded.startIps).toHaveLength(2);
    expect(decoded.metadataList[decoded.metaIndices[0]].type).toBe('A');
    expect(decoded.metadataList[decoded.metaIndices[1]].type).toBe('B');
  });

  it('should include Bloom filter if provided', () => {
    const ranges: IPRange[] = [];
    const bloom = new BloomFilter(100, 3);
    bloom.add('1.2.3.4');

    const encoded = BinaryCodec.encode(ranges, bloom);
    const decoded = BinaryCodec.decode(encoded);

    expect(decoded.bloom).toBeDefined();
    expect(decoded.bloom!.has('1.2.3.4')).toBe(true);
    expect(decoded.bloom!.has('5.6.7.8')).toBe(false);
  });

  it('should encode and decode IPv6 ranges', () => {
    const ranges: IPRange[] = [
      { start: '2001:db8::1', end: '2001:db8::1', data: { type: 'v6-node' } },
      { start: '::1', end: '::1', data: { type: 'localhost' } },
    ];

    const encoded = BinaryCodec.encode(ranges);
    const decoded = BinaryCodec.decode(encoded);

    expect(decoded.startIpsV6).toHaveLength(4); // 2 ranges * 2 BigInts

    // Check first range (2001:db8::1)
    // 2001:0db8:0000:0000:0000:0000:0000:0001
    // High: 0x20010db800000000n, Low: 0x0000000000000001n
    const high = decoded.startIpsV6[0];
    const low = decoded.startIpsV6[1];

    expect(high).toBe(0x20010db800000000n);
    expect(low).toBe(1n);

    expect(decoded.metadataList[decoded.metaIndicesV6[0]].type).toBe('v6-node');
  });

  it('should mix IPv4 and IPv6 ranges', () => {
    const ranges: IPRange[] = [
      { start: '1.2.3.4', end: '1.2.3.5', data: { type: 'v4' } },
      { start: '2001::1', end: '2001::2', data: { type: 'v6' } },
    ];

    const encoded = BinaryCodec.encode(ranges);
    const decoded = BinaryCodec.decode(encoded);

    expect(decoded.startIps).toHaveLength(1);
    expect(decoded.startIpsV6).toHaveLength(2); // 1 range * 2

    expect(decoded.metadataList[decoded.metaIndices[0]].type).toBe('v4');
    expect(decoded.metadataList[decoded.metaIndicesV6[0]].type).toBe('v6');
  });
});
