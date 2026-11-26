// CloudProviderScraper interface defined locally to avoid import loops
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Cloudflare',
  slug: 'cloudflare',
  async fetchRanges() {
    console.log('Fetching Cloudflare IP ranges...');
    const url = 'https://api.cloudflare.com/client/v4/ips';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Cloudflare ranges: ${res.statusText}`);

    const data = await res.json();
    // data.result.ipv4_cidrs, data.result.ipv6_cidrs

    if (!data.success) throw new Error('Cloudflare API returned success: false');

    const prefixes = [...(data.result.ipv4_cidrs || []), ...(data.result.ipv6_cidrs || [])];

    return [
      {
        prefixes,
        service: 'CDN/Edge',
        region: 'Global',
      },
    ];
  },
};
