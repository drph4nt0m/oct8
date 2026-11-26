// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Linode',
  slug: 'linode',
  async fetchRanges() {
    console.log('Fetching Linode IP ranges...');
    const url = 'https://geoip.linode.com/';
    // It is a CSV.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Linode ranges: ${res.statusText}`);

    const text = await res.text();
    const lines = text.split('\n');
    const prefixes: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(',');
      if (parts.length > 0 && parts[0].includes('/')) {
        prefixes.push(parts[0]);
      }
    }

    return [
      {
        prefixes,
        service: 'Linode Cloud',
        region: 'Global',
      },
    ];
  },
};
