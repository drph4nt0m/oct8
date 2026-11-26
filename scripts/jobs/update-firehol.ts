import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'reputation.json');

const LISTS = [
  {
    slug: 'firehol_level1',
    url: 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset',
    type: 'threat',
    category: 'malware',
    name: 'FireHOL Level 1',
  },
  {
    slug: 'firehol_proxies',
    url: 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_proxies.netset',
    type: 'anonymizer', // mapped to is_proxy
    category: 'proxy',
    name: 'Open Proxies',
  },
  {
    slug: 'tor_exits',
    url: 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/tor_exits.ipset',
    type: 'anonymizer', // mapped to is_tor
    category: 'tor',
    name: 'Tor Exit Nodes',
  },
];

async function fetchList(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const text = await res.text();

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')); // valid lines only
}

export async function run() {
  console.log('--- Starting FireHOL Update Job ---');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const reputationData: Record<string, string[]> = {};

  for (const list of LISTS) {
    try {
      console.log(`Fetching ${list.slug}...`);
      const ips = await fetchList(list.url);
      reputationData[list.slug] = ips;
      console.log(`Parsed ${ips.length} entries for ${list.slug}`);
    } catch (error) {
      console.error(`Failed to update ${list.slug}:`, error);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(reputationData, null, 2));
  console.log(`Saved reputation data to ${OUTPUT_FILE}`);
  console.log('--- FireHOL Update Job Complete ---');
}
