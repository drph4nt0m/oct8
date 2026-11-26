// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Atlassian',
  slug: 'atlassian',
  async fetchRanges() {
    console.log('Fetching Atlassian IP ranges...');
    const url = 'https://ip-ranges.atlassian.com/';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Atlassian ranges: ${res.statusText}`);

    const data = await res.json();
    // data.items = [ { cidr: "...", conversion: "...", region: "..." } ]

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.items.map((item: any) => ({
      prefixes: [item.cidr],
      region: 'Global', // Atlassian list often doesn't specify region per CIDR clearly in top level, mostly global services.
      service: 'Atlassian Cloud',
    }));
  },
};
