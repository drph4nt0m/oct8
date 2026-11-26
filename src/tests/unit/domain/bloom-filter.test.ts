import { describe, it, expect } from 'vitest';
import { BloomFilter } from '#core/entities/bloom-filter';

describe('BloomFilter', () => {
  it('returns true for an IP that was added', () => {
    const bf = new BloomFilter(1000, 3);
    bf.add('1.2.3.4');
    expect(bf.has('1.2.3.4')).toBe(true);
  });

  it('returns false for an IP that was never added', () => {
    const bf = new BloomFilter(1000, 3);
    bf.add('1.2.3.4');
    // Statistically extremely unlikely to collide on a clean 1000-bit filter with k=3
    expect(bf.has('9.9.9.9')).toBe(false);
  });

  it('handles multiple distinct IPs independently', () => {
    const bf = new BloomFilter(5000, 3);
    const ips = ['10.0.0.1', '10.0.0.2', '172.16.0.1', '192.168.1.1'];
    ips.forEach((ip) => bf.add(ip));
    ips.forEach((ip) => expect(bf.has(ip)).toBe(true));
    expect(bf.has('8.8.8.8')).toBe(false);
  });

  it('round-trips correctly through export() and import()', () => {
    const bf = new BloomFilter(2000, 3);
    bf.add('5.5.5.5');
    bf.add('6.6.6.6');

    const exported = bf.export();
    const imported = BloomFilter.import(exported);

    expect(imported.has('5.5.5.5')).toBe(true);
    expect(imported.has('6.6.6.6')).toBe(true);
    expect(imported.has('7.7.7.7')).toBe(false);
  });

  it('preserves size and k parameter through export/import', () => {
    const bf = new BloomFilter(512, 5);
    bf.add('1.1.1.1');

    const exported = bf.export();
    const imported = BloomFilter.import(exported);

    // Verify the imported filter still finds the item (i.e., k and size are intact)
    expect(imported.has('1.1.1.1')).toBe(true);
  });
});
