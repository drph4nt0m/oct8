export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Amazon Web Services',
  slug: 'aws',
  async fetchRanges() {
    console.log('Fetching AWS IP ranges...');
    const url = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch AWS ranges: ${res.statusText}`);

    const data = await res.json();
    // data.prefixes = [{ ip_prefix: "...", region: "...", service: "..." }, ...]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.prefixes.map((p: any) => ({
      prefixes: [p.ip_prefix || p.ipv6_prefix].filter(Boolean),
      region: p.region,
      service: p.service,
    }));
  },
};
