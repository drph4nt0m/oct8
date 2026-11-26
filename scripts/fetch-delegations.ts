import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUT_FILE = path.join(DATA_DIR, 'whois.json');

const RIR_URLS = [
  'https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest',
  'https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest',
  'https://ftp.apnic.net/pub/stats/apnic/delegated-apnic-extended-latest',
  'https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-extended-latest',
  'https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest',
];

interface WhoisEntry {
  registry: string;
  country: string;
  allocated: string;
  status: string;
}

// Map CIDR counts to mask lengths
const countToMask = (count: number): number => {
  return 32 - Math.log2(count);
};

async function fetchDelegations() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const result: Record<string, WhoisEntry> = {};
  let totalEntries = 0;

  for (const url of RIR_URLS) {
    const rirName = url.split('/')[4]; // basic extraction, e.g., 'arin', 'ripencc'
    console.log(`Fetching from ${rirName}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        continue;
      }

      const text = await response.text();
      const lines = text.split('\n');

      let parsedCount = 0;
      for (const line of lines) {
        // Format: registry|cc|type|start|value|date|status
        // Example: arin|US|ipv4|8.8.8.0|256|19921201|allocated
        if (line.startsWith('#') || line.trim() === '') continue;

        const parts = line.split('|');
        if (parts.length < 7) continue;

        const registry = parts[0];
        const country = parts[1];
        const type = parts[2];
        const start = parts[3];
        const value = parseInt(parts[4], 10);
        const date = parts[5];
        const status = parts[6];

        if (type === 'ipv4' && !isNaN(value) && value > 0 && status !== 'available') {
          const mask = countToMask(value);
          if (Number.isInteger(mask)) {
            const cidr = `${start}/${mask}`;
            result[cidr] = {
              registry,
              country: country === '*' ? '' : country,
              allocated: date,
              status,
            };
            parsedCount++;
            totalEntries++;
          }
        }
      }
      console.log(`Parsed ${parsedCount} IPv4 entries from ${rirName}`);
    } catch (err) {
      console.error(`Error processing ${rirName}:`, err);
    }
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nSuccessfully wrote ${totalEntries} entries to ${OUT_FILE}`);
}

fetchDelegations().catch(console.error);
