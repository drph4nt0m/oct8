// Helper for bitwise operations
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export class BloomFilter {
  private size: number;
  public buffer: Uint8Array;
  private k: number; // Number of hash functions

  constructor(sizeBits: number, k: number = 3) {
    this.size = sizeBits;
    this.k = k;
    this.buffer = new Uint8Array(Math.ceil(sizeBits / 8));
  }

  add(ip: string): void {
    const hashes = this.getHashes(ip);
    for (const h of hashes) {
      const idx = h % this.size;
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      this.buffer[byteIdx] |= 1 << bitIdx;
    }
  }

  has(ip: string): boolean {
    const hashes = this.getHashes(ip);
    for (const h of hashes) {
      const idx = h % this.size;
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      if ((this.buffer[byteIdx] & (1 << bitIdx)) === 0) return false;
    }
    return true;
  }

  export(): Uint8Array {
    // Format: [SizeBits: UInt32][K: UInt8][Buffer]
    const head = new Uint8Array(5);
    const view = new DataView(head.buffer);
    view.setUint32(0, this.size, false); // Big Endian
    view.setUint8(4, this.k);

    const combined = new Uint8Array(5 + this.buffer.length);
    combined.set(head, 0);
    combined.set(this.buffer, 5);
    return combined;
  }

  static import(buf: Uint8Array): BloomFilter {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const size = view.getUint32(0, false);
    const k = view.getUint8(4);
    const bf = new BloomFilter(size, k);

    const data = buf.subarray(5);
    bf.buffer.set(data);
    return bf;
  }

  // FNV-1a based double hashing to generate K hashes
  private getHashes(key: string): number[] {
    // FNV-1a 32-bit hash implementation
    let h1 = FNV_OFFSET;
    for (let i = 0; i < key.length; i++) {
      h1 ^= key.charCodeAt(i);
      h1 = Math.imul(h1, FNV_PRIME);
    }
    h1 = h1 >>> 0;

    // Second hash (simple variant)
    let h2 = h1;
    h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b);
    h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
    h2 = (h2 ^ (h2 >>> 16)) >>> 0;

    const results: number[] = [];
    for (let i = 0; i < this.k; i++) {
      // Double hashing: h(i) = (h1 + i * h2) % m
      results.push((h1 + Math.imul(i, h2)) >>> 0);
    }
    return results;
  }
}
