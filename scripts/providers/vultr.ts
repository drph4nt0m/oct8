// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Vultr',
  slug: 'vultr',
  async fetchRanges() {
    console.log('Fetching Vultr IP ranges...');
    const url = 'https://geofeed.constant.com/?json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Vultr ranges: ${res.statusText}`);

    const data = await res.json();
    // Debug showed: { "subnets": [ { "ip_prefix": "...", ... } ] }

    if (data.subnets && Array.isArray(data.subnets)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.subnets.map((item: any) => ({
        prefixes: [item.ip_prefix],
        region: `${item.region} (${item.city})`,
        service: 'Vultr Cloud',
      }));
    }

    return [];
  },
};
