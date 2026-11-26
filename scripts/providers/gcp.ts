// CloudProviderScraper interface defined locally to avoid import loops/complexities in script runner

// Actually aws.ts exports scraper object, not just interface.
// Let's use the interface if exported, or redefine/refactor.
// Checking aws.ts content... it exported `CloudProviderScraper` interface.

export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Google Cloud Platform',
  slug: 'gcp',
  async fetchRanges() {
    console.log('Fetching GCP IP ranges...');
    const url = 'https://www.gstatic.com/ipranges/cloud.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch GCP ranges: ${res.statusText}`);

    const data = await res.json();
    // data.prefixes = [{ ipv4Prefix: "...", ipv6Prefix: "...", service: "...", scope: "..." }]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.prefixes.map((p: any) => ({
      prefixes: [p.ipv4Prefix, p.ipv6Prefix].filter(Boolean),
      region: p.scope,
      service: p.service || 'Google Cloud',
    }));
  },
};
