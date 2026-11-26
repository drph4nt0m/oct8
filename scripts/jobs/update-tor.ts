import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPUTATION_FILE = path.join(DATA_DIR, 'reputation.json');
const ONIONOO_URL =
  'https://onionoo.torproject.org/details?type=relay&running=true&flag=Exit&fields=exit_addresses,or_addresses';

export async function run() {
  console.log('--- Starting Tor Project Update Job ---');

  if (!fs.existsSync(REPUTATION_FILE)) {
    console.warn('reputation.json not found, skipping Tor update (FireHOL job should run first)');
    return;
  }

  try {
    console.log(`Fetching from ${ONIONOO_URL}...`);
    const res = await fetch(ONIONOO_URL);
    if (!res.ok) throw new Error(`Onionoo failed: ${res.statusText}`);

    const data = await res.json();
    const relays = data.relays || [];
    console.log(`Fetched ${relays.length} exit relays.`);

    const torIPs = new Set<string>();

    for (const relay of relays) {
      // 1. Explicit exit addresses (mostly IPv4)
      if (relay.exit_addresses) {
        for (const ip of relay.exit_addresses) {
          torIPs.add(ip);
        }
      }

      // 2. OR addresses (often contains the IPv6 addresses not listed in exit_addresses)
      // Because Tor browsers can connect to IPv6 services via these OR addresses,
      // it is critical we capture them for comprehensive blocklists/detection.
      if (relay.or_addresses) {
        for (const addr of relay.or_addresses) {
          // addr format: "IP:Port" or "[IPv6]:Port"
          const lastColon = addr.lastIndexOf(':');
          if (lastColon === -1) continue;

          let ip = addr.substring(0, lastColon);
          // Remove IPv6 brackets if present (e.g., "[2001:db8::1]")
          if (ip.startsWith('[') && ip.endsWith(']')) {
            ip = ip.substring(1, ip.length - 1);
          }
          torIPs.add(ip);
        }
      }
    }

    const torList = Array.from(torIPs);
    console.log(`Identified ${torList.length} unique Tor exit IPs.`);

    // Separate metrics
    const v6Count = torList.filter((ip) => ip.includes(':')).length;
    console.log(`IPv4: ${torList.length - v6Count}, IPv6: ${v6Count}`);

    // Update reputation.json
    const repData = JSON.parse(fs.readFileSync(REPUTATION_FILE, 'utf-8'));

    // Merge with existing 'tor_exits' or create
    const existing = new Set(repData['tor_exits'] || []);
    for (const ip of torList) {
      existing.add(ip);
    }

    repData['tor_exits'] = Array.from(existing);

    fs.writeFileSync(REPUTATION_FILE, JSON.stringify(repData, null, 2));
    console.log(
      `Updated reputation.json with Tor data. Total tor_exits: ${repData['tor_exits'].length}`,
    );
  } catch (error) {
    console.error('Failed to update Tor data:', error);
  }

  console.log('--- Tor Project Update Job Complete ---');
}
