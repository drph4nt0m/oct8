// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Fastly',
  slug: 'fastly',
  async fetchRanges() {
    console.log('Fetching Fastly IP ranges...');
    const url = 'https://api.fastly.com/public-ip-list';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Fastly ranges: ${res.statusText}`);

    const data = await res.json();
    // data.addresses, data.ipv6_addresses

    const prefixes = [...(data.addresses || []), ...(data.ipv6_addresses || [])];

    return [
      {
        prefixes,
        service: 'CDN/Edge',
        region: 'Global',
      },
    ];
  },
};
