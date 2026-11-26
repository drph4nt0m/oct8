import fs from 'node:fs/promises';
import path from 'node:path';
import { BinaryAdapter } from '../src/infra/adapters/IntelligenceAdapter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../data/insight.bin');

async function debug() {
  console.log('Loading insight.bin...');
  try {
    const buffer = await fs.readFile(DATA_FILE);
    const adapter = new BinaryAdapter();
    await adapter.init(buffer);
    console.log('Adapter initialized.');

    // Test IPv4
    const ip4 = '2.56.10.36';
    console.log(`Looking up IPv4: ${ip4}`);
    const result4 = adapter.lookup(ip4);
    console.log('Result IPv4:', JSON.stringify(result4, null, 2));

    // Test IPv6
    const ip6 = '2001:67c:89c:702:1ce:1ce:babe:1';
    console.log(`Looking up IPv6: ${ip6}`);
    const result6 = adapter.lookup(ip6);
    console.log('Result IPv6:', JSON.stringify(result6, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

debug();
