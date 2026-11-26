import { IPRange as IPRangeType } from '#core/entities/types';
import { InsightError } from '#core/result';
import { BloomFilter } from '#core/entities/bloom-filter';
import { IPUtils } from '#core/utils/ip-utils';

export type IPRange = IPRangeType;
export { BloomFilter };

// Binary Format Specification v1:
// [Header]
// - Magic: 'OCT8' (4 bytes)
// - Version: 1 (1 byte)
// - Metadata Count: UInt32 (4 bytes)
// - Ranges Count V4: UInt32 (4 bytes)
// - Ranges Count V6: UInt32 (4 bytes)
// - Bloom Length: UInt32 (4 bytes)
//
// [Metadata Section]
// - [Length: UInt16][JSON String Bytes]...
//
// [IPv4 Ranges Section]
// - [StartIP: UInt32][EndIP: UInt32][MetadataIndex: UInt16]...
//
// [IPv6 Ranges Section]
// - [StartIP_High: UInt64][StartIP_Low: UInt64][EndIP_High: UInt64][EndIP_Low: UInt64][MetadataIndex: UInt16]...
//
// [Bloom Filter Section]
// - [SizeBits: UInt32][K: UInt8][Buffer...]

export class BinaryCodec {
  // Encode generic IP ranges into a binary buffer
  static encode(ranges: IPRange[], bloom?: BloomFilter): Uint8Array {
    // 1. Separate V4 and V6
    const rangesV4: IPRange[] = [];
    const rangesV6: IPRange[] = [];

    for (const r of ranges) {
      if (r.start.includes(':')) {
        rangesV6.push(r);
      } else {
        rangesV4.push(r);
      }
    }

    // 2. Deduplicate Metadata (shared)
    const metadataMap = new Map<string, number>();
    const metadataList: string[] = [];

    const addMetadata = (data: Record<string, unknown>) => {
      const json = JSON.stringify(data);
      if (!metadataMap.has(json)) {
        metadataMap.set(json, metadataList.length);
        metadataList.push(json);
      }
      return metadataMap.get(json)!;
    };

    // Index metadata for both
    rangesV4.forEach((r) => addMetadata(r.data));
    rangesV6.forEach((r) => addMetadata(r.data));

    // 3. Prepare Buffers
    // Header V1: Magic(4) + Ver(1) + MetaCnt(4) + V4Cnt(4) + V6Cnt(4) + BloomLen(4) = 21 bytes
    const headerSize = 21;

    // Metadata Buffer
    const metaParts: Uint8Array[] = [];
    let metaTotalLen = 0;
    const encoder = new TextEncoder();

    for (const meta of metadataList) {
      const buf = encoder.encode(meta);
      const len = new Uint8Array(2);
      new DataView(len.buffer).setUint16(0, buf.length, false);
      metaParts.push(len, buf);
      metaTotalLen += 2 + buf.length;
    }

    // V4 Range Buffer
    // Each range: 4 (Start) + 4 (End) + 2 (Index) = 10 bytes
    const rangeV4Size = 10;
    const rangeV4Buffer = new Uint8Array(rangesV4.length * rangeV4Size);
    const rangeV4View = new DataView(rangeV4Buffer.buffer);

    let offsetV4 = 0;
    for (const range of rangesV4) {
      const startInt = IPUtils.ipToUint32(range.start);
      const endInt = IPUtils.ipToUint32(range.end);
      const metaIndex = metadataMap.get(JSON.stringify(range.data))!;

      if (startInt === null || endInt === null) continue;

      rangeV4View.setUint32(offsetV4, Number(startInt), false);
      rangeV4View.setUint32(offsetV4 + 4, Number(endInt), false);
      rangeV4View.setUint16(offsetV4 + 8, metaIndex, false);
      offsetV4 += rangeV4Size;
    }

    // V6 Range Buffer
    // Each range: 16 (Start) + 16 (End) + 2 (Index) = 34 bytes
    const rangeV6Size = 34;
    const rangeV6Buffer = new Uint8Array(rangesV6.length * rangeV6Size);
    const rangeV6View = new DataView(rangeV6Buffer.buffer);

    let offsetV6 = 0;
    for (const range of rangesV6) {
      const startBig = IPUtils.ipv6ToBigInt(range.start);
      const endBig = IPUtils.ipv6ToBigInt(range.end);
      const metaIndex = metadataMap.get(JSON.stringify(range.data))!;

      if (startBig === null || endBig === null) continue;

      // Start IP (High, Low)
      rangeV6View.setBigUint64(offsetV6, (startBig >> 64n) & 0xffff_ffff_ffff_ffffn, false);
      rangeV6View.setBigUint64(offsetV6 + 8, startBig & 0xffff_ffff_ffff_ffffn, false);
      // End IP (High, Low)
      rangeV6View.setBigUint64(offsetV6 + 16, (endBig >> 64n) & 0xffff_ffff_ffff_ffffn, false);
      rangeV6View.setBigUint64(offsetV6 + 24, endBig & 0xffff_ffff_ffff_ffffn, false);

      rangeV6View.setUint16(offsetV6 + 32, metaIndex, false);
      offsetV6 += rangeV6Size;
    }

    // Bloom Buffer
    const bloomBuffer = bloom ? bloom.export() : new Uint8Array(0);

    // 4. Construct Final Buffer
    const totalLen =
      headerSize + metaTotalLen + rangeV4Buffer.length + rangeV6Buffer.length + bloomBuffer.length;
    const finalBuffer = new Uint8Array(totalLen);
    const finalView = new DataView(finalBuffer.buffer);

    let cursor = 0;

    // Header
    // Magic 'OCT8' -> 0x4F435438
    finalView.setUint32(cursor, 0x4f435438, false);
    cursor += 4;
    finalView.setUint8(cursor, 1); // Version 1 (V3 Schema)
    cursor += 1;
    finalView.setUint32(cursor, metadataList.length, false);
    cursor += 4;
    finalView.setUint32(cursor, rangesV4.length, false);
    cursor += 4;
    finalView.setUint32(cursor, rangesV6.length, false); // V6 Count
    cursor += 4;
    finalView.setUint32(cursor, bloomBuffer.length, false);
    cursor += 4;

    // Metadata
    for (const p of metaParts) {
      finalBuffer.set(p, cursor);
      cursor += p.length;
    }

    // V4 Ranges
    finalBuffer.set(rangeV4Buffer, cursor);
    cursor += rangeV4Buffer.length;

    // V6 Ranges
    finalBuffer.set(rangeV6Buffer, cursor);
    cursor += rangeV6Buffer.length;

    // Bloom
    finalBuffer.set(bloomBuffer, cursor);

    return finalBuffer;
  }

  static decode(input: Uint8Array | ArrayBuffer): {
    startIps: Uint32Array;
    endIps: Uint32Array;
    startIpsV6: BigUint64Array; // Stores high/low as pairs
    endIpsV6: BigUint64Array;
    metaIndices: Uint16Array;
    metaIndicesV6: Uint16Array;
    metadataList: Record<string, unknown>[];
    bloom?: BloomFilter;
  } {
    const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // 1. Read Header
    const magic = view.getUint32(0, false);
    if (magic !== 0x4f435438)
      throw new InsightError('BINARY_INVALID_MAGIC', 'Invalid binary format: Bad Magic');

    const version = view.getUint8(4);
    if (version !== 1)
      throw new InsightError(
        'BINARY_UNSUPPORTED_VERSION',
        `Unsupported version: ${version}. Expected V1.`,
      );

    const metaCount = view.getUint32(5, false);
    const rangeV4Count = view.getUint32(9, false);
    const rangeV6Count = view.getUint32(13, false);
    const bloomLen = view.getUint32(17, false);

    let offset = 21; // Fixed V1 header size

    // 2. Read Metadata
    const metadataList: Record<string, unknown>[] = [];
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < metaCount; i++) {
      const len = view.getUint16(offset, false);
      offset += 2;
      const jsonBytes = buffer.subarray(offset, offset + len);
      const jsonStr = decoder.decode(jsonBytes);
      metadataList.push(JSON.parse(jsonStr));
      offset += len;
    }

    // 3. Read V4 Ranges
    const startIps = new Uint32Array(rangeV4Count);
    const endIps = new Uint32Array(rangeV4Count);
    const metaIndices = new Uint16Array(rangeV4Count);

    for (let i = 0; i < rangeV4Count; i++) {
      startIps[i] = view.getUint32(offset, false);
      endIps[i] = view.getUint32(offset + 4, false);
      metaIndices[i] = view.getUint16(offset + 8, false);
      offset += 10;
    }

    // 4. Read V6 Ranges
    // We store V6 as 2x 64-bit integers per IP to be memory efficient and allow binary search
    // Structure: [High, Low]
    const startIpsV6 = new BigUint64Array(rangeV6Count * 2);
    const endIpsV6 = new BigUint64Array(rangeV6Count * 2);
    const metaIndicesV6 = new Uint16Array(rangeV6Count);

    for (let i = 0; i < rangeV6Count; i++) {
      // Start IP
      startIpsV6[i * 2] = view.getBigUint64(offset, false); // High
      startIpsV6[i * 2 + 1] = view.getBigUint64(offset + 8, false); // Low
      // End IP
      endIpsV6[i * 2] = view.getBigUint64(offset + 16, false); // High
      endIpsV6[i * 2 + 1] = view.getBigUint64(offset + 24, false); // Low

      metaIndicesV6[i] = view.getUint16(offset + 32, false);
      offset += 34;
    }

    // 5. Read Bloom
    let bloom: BloomFilter | undefined;
    if (bloomLen > 0) {
      const bloomBuf = buffer.subarray(offset, offset + bloomLen);
      bloom = BloomFilter.import(bloomBuf);
    }

    return {
      startIps,
      endIps,
      startIpsV6,
      endIpsV6,
      metaIndices,
      metaIndicesV6,
      metadataList,
      bloom,
    };
  }

  // Helpers
  static cidrToRange(cidr: string): { start: string; end: string } {
    return IPUtils.cidrToRange(cidr);
  }

  static merge(ranges: IPRange[]): IPRange[] {
    if (ranges.length === 0) return [];

    // Separate V4 / V6
    const v4 = ranges.filter((r) => !r.start.includes(':'));
    const v6 = ranges.filter((r) => r.start.includes(':'));

    return [...this.mergeV4(v4), ...this.mergeV6(v6)];
  }

  private static mergeV4(ranges: IPRange[]): IPRange[] {
    if (ranges.length === 0) return [];
    ranges.sort((a, b) => {
      const aInt = IPUtils.ipToUint32(a.start) ?? 0n;
      const bInt = IPUtils.ipToUint32(b.start) ?? 0n;
      const diff = aInt - bInt;
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });
    return this.doMerge(
      ranges,
      (ip) => IPUtils.ipToUint32(ip) ?? 0n,
      (int) => int + 1n,
      (int) => IPUtils.uint32ToIp(Number(int))!,
    );
  }

  private static mergeV6(ranges: IPRange[]): IPRange[] {
    if (ranges.length === 0) return [];
    ranges.sort((a, b) => {
      const aInt = IPUtils.ipv6ToBigInt(a.start) ?? 0n;
      const bInt = IPUtils.ipv6ToBigInt(b.start) ?? 0n;
      const diff = aInt - bInt;
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });
    return this.doMerge(
      ranges,
      (ip) => IPUtils.ipv6ToBigInt(ip) ?? 0n,
      (int) => int + 1n,
      (int) => IPUtils.bigIntToIpv6(int)!,
    );
  }

  private static doMerge(
    ranges: IPRange[],
    toInt: (ip: string) => bigint,
    nextIP: (int: bigint) => bigint,
    fromInt?: (int: bigint) => string,
  ): IPRange[] {
    if (ranges.length === 0) return [];

    // We need fromInt to construct new ranges. If not provided, we can't sweep line properly,
    // but we can pass it from mergeV4 and mergeV6.
    if (!fromInt) throw new Error('fromInt is required for doMerge');

    interface Event {
      point: bigint;
      type: 'start' | 'end';
      data: Record<string, unknown>;
      id: number;
    }

    const events: Event[] = [];
    ranges.forEach((r, i) => {
      events.push({ point: toInt(r.start), type: 'start', data: r.data, id: i });
      events.push({ point: nextIP(toInt(r.end)), type: 'end', data: r.data, id: i });
    });

    // Sort events: primary by point, secondary by type (start before end)
    events.sort((a, b) => {
      if (a.point < b.point) return -1;
      if (a.point > b.point) return 1;
      if (a.type === 'start' && b.type === 'end') return -1;
      if (a.type === 'end' && b.type === 'start') return 1;
      return 0;
    });

    const merged: IPRange[] = [];
    const active = new Map<number, Record<string, unknown>>();
    let lastPoint: bigint | null = null;

    for (const event of events) {
      if (lastPoint !== null && event.point > lastPoint && active.size > 0) {
        // Create an interval from lastPoint to event.point - 1
        let combinedData: Record<string, unknown> = {};
        for (const data of active.values()) {
          combinedData = { ...combinedData, ...data };
        }

        const prevEndInt = event.point - 1n; // For IP Math this works for both V4/V6 if we treat it simply as integer subtraction

        // Attempt to merge with previous contiguous interval if data is identical
        if (merged.length > 0) {
          const lastMerged = merged[merged.length - 1];
          if (
            nextIP(toInt(lastMerged.end)) === lastPoint &&
            JSON.stringify(lastMerged.data) === JSON.stringify(combinedData)
          ) {
            lastMerged.end = fromInt(prevEndInt);
          } else {
            merged.push({
              start: fromInt(lastPoint),
              end: fromInt(prevEndInt),
              data: combinedData,
            });
          }
        } else {
          merged.push({
            start: fromInt(lastPoint),
            end: fromInt(prevEndInt),
            data: combinedData,
          });
        }
      }

      if (event.type === 'start') {
        active.set(event.id, event.data);
      } else {
        active.delete(event.id);
      }

      lastPoint = event.point;
    }

    return merged;
  }
}
