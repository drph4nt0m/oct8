// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Oracle Cloud',
  slug: 'oracle',
  async fetchRanges() {
    console.log('Fetching Oracle IP ranges...');
    const url = 'https://docs.cloud.oracle.com/en-us/iaas/tools/public_ip_ranges.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Oracle ranges: ${res.statusText}`);

    const data = await res.json();
    // data.cidrs = [ { cidr: "...", tags: ["OCI", "REG"], regions: ["us-ashburn-1"] } ] — Wait, verifying schema.
    // Research said: `regions` (grouped), `cidrs` (group).
    // Actually typical OCI JSON:
    // { "last_updated_timestamp": "...", "regions": [ { "region": "us-ashburn-1", "cidrs": [ { "cidr": "..." } ] } ] }
    // OR flat list?

    // Research summary said: `regions` (IP CIDR ranges grouped by region), and also `cidrs`.
    // Let's handle both possibilities or the most likely structure.

    // Checking Oracle docs structure commonly:
    // { "regions": [ { "region": "...", "cidrs": [ { "cidr": "..." } ] } ] }

    const results: { prefixes: string[]; service?: string; region?: string }[] = [];

    if (data.regions && Array.isArray(data.regions)) {
      for (const r of data.regions) {
        // r.cidrs is array of { cidr: string, tags: string[] }
        if (r.cidrs) {
          for (const c of r.cidrs) {
            results.push({
              prefixes: [c.cidr],
              region: r.region,
              service: (c.tags || []).join(', ') || 'OCI',
            });
          }
        }
      }
    } else if (data.cidrs && Array.isArray(data.cidrs)) {
      // Fallback for flat structure
      for (const c of data.cidrs) {
        results.push({
          prefixes: [c.cidr],
          region: c.region || 'Global',
          service: (c.tags || []).join(', ') || 'OCI',
        });
      }
    }

    return results;
  },
};
