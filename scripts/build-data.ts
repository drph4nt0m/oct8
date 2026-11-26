import fs from 'node:fs/promises';
import path from 'node:path';
import { BinaryCodec, IPRange, BloomFilter } from '../src/core/entities/codec';
import { pathToFileURL } from 'url';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const OUT_FILE = path.resolve(DATA_DIR, 'insight.bin');

export async function run() {
  console.log('--- Building Optimized Data Artifact ---');

  const ranges: IPRange[] = [];
  // Initialize Bloom Filter for ~2M entries
  // 20,000,000 bits = ~2.5MB. k=3.
  // for 1.8M items, p ~= 1.2% false positive rate
  const bloom = new BloomFilter(20_000_000, 3);
  let bloomCount = 0;

  // 1. Load Cloud Identity
  try {
    const cloudPath = path.resolve(DATA_DIR, 'cloud.json');
    const cloudRaw = await fs.readFile(cloudPath, 'utf-8');
    const cloudData = JSON.parse(cloudRaw);

    // cloud.json structure: { "aws": { prefixes: [...] }, ... }
    for (const [slug, data] of Object.entries(cloudData)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerData = data as any;
      for (const p of providerData.prefixes) {
        // Handle both simple string prefixes and object prefixes
        const prefixStr = typeof p === 'string' ? p : p.prefix;

        const { start, end } = BinaryCodec.cidrToRange(prefixStr);
        ranges.push({
          start,
          end,
          data: {
            identity: {
              slug,
              service: typeof p === 'object' ? p.service : undefined,
              region: typeof p === 'object' ? p.region : undefined,
            },
          },
        });
      }
    }
    console.log(`Loaded ${ranges.length} Identity ranges.`);
  } catch (e) {
    console.warn('Skipping Cloud Data (not found or invalid)', e);
  }

  // 2. Load Reputation
  try {
    const repPath = path.resolve(DATA_DIR, 'reputation.json');
    const repRaw = await fs.readFile(repPath, 'utf-8');
    const repData = JSON.parse(repRaw);

    let repCount = 0;
    for (const [category, list] of Object.entries(repData)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cidrs = list as string[];

      // Use Bloom Filter for the massive proxy list
      if (category === 'firehol_proxies') {
        for (const cidr of cidrs) {
          if (cidr.includes('/') && !cidr.endsWith('/32')) {
            const { start, end } = BinaryCodec.cidrToRange(cidr);
            ranges.push({ start, end, data: { reputation: { category } } });
            repCount++;
          } else {
            const ip = cidr.split('/')[0];
            bloom.add(ip);
            bloomCount++;
          }
        }
        continue;
      }

      for (const cidr of cidrs) {
        const { start, end } = BinaryCodec.cidrToRange(cidr);
        ranges.push({
          start,
          end,
          data: {
            reputation: {
              category,
            },
          },
        });
        repCount++;
      }
    }
    console.log(`Loaded ${repCount} Reputation ranges.`);
    console.log(`Loaded ${bloomCount} IPs into Bloom Filter.`);
  } catch (e) {
    console.warn('Skipping Reputation Data (not found or invalid)', e);
  }

  // 2.5 Load Whois
  try {
    const whoisPath = path.resolve(DATA_DIR, 'whois.json');
    const whoisRaw = await fs.readFile(whoisPath, 'utf-8');
    const whoisData = JSON.parse(whoisRaw);

    let whoisCount = 0;
    for (const [cidr, info] of Object.entries(whoisData)) {
      if (typeof info !== 'object' || info === null) continue;
      const { start, end } = BinaryCodec.cidrToRange(cidr);
      ranges.push({
        start,
        end,
        data: {
          whois: {
            ...(info as Record<string, unknown>)
          },
        },
      });
      whoisCount++;
    }
    console.log(`Loaded ${whoisCount} Whois ranges.`);
  } catch (e) {
    console.warn('Skipping Whois Data (not found or invalid)', e);
  }

  if (ranges.length === 0) {
    console.error('No data found to compile! Please run update-db first or check data sources.');
    // Don't exit process, just return
    return;
  }

  // 3. Compile
  console.log(`Compiling ${ranges.length} raw ranges + ${bloomCount} bloom entries...`);

  // Merge
  const mergedRanges = BinaryCodec.merge(ranges);
  console.log(
    `Merged down to ${mergedRanges.length} ranges (Reduction: ${((1 - mergedRanges.length / ranges.length) * 100).toFixed(1)}%)`,
  );

  const start = performance.now();
  const buffer = BinaryCodec.encode(mergedRanges, bloom);
  const end = performance.now();

  // 4. Save
  await fs.writeFile(OUT_FILE, buffer);

  console.log(`\n--- Build Complete ---`);
  console.log(`Output: ${OUT_FILE}`);
  console.log(`Binary Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Time: ${(end - start).toFixed(0)}ms`);
}

// Only run matching if executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(console.error);
}
