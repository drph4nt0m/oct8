// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Salesforce',
  slug: 'salesforce',
  async fetchRanges() {
    console.log('Fetching Salesforce IP ranges...');
    const url = 'https://ip-ranges.salesforce.com/ip-ranges.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Salesforce ranges: ${res.statusText}`);

    // Structure: { prefixes: [ { ip_prefix: ["..."], region: "...", provider: "..." }, ... ] }
    const data = await res.json();

    const items = data.prefixes || [];
    const results: { prefixes: string[]; service?: string; region?: string }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of items) {
      if (item.ip_prefix) {
        results.push({
          prefixes: Array.isArray(item.ip_prefix) ? item.ip_prefix : [item.ip_prefix],
          region: item.region || 'Global',
          service: `Salesforce (${item.provider || 'Core'})`,
        });
      }
    }

    return results;
  },
};
