// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'DigitalOcean',
  slug: 'digitalocean',
  async fetchRanges() {
    console.log('Fetching DigitalOcean IP ranges...');
    // Using the CSV that Linode and others often reference for Google Geofeed which includes DO?
    // Wait, `http://digitalocean.com/geo/google.csv` was the target.
    const url = 'http://digitalocean.com/geo/google.csv';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch DigitalOcean ranges: ${res.statusText}`);

    const text = await res.text();
    const lines = text.split('\n');
    const prefixes: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length > 0 && parts[0].includes('/')) {
        prefixes.push(parts[0]);
      }
    }

    return [
      {
        prefixes,
        service: 'DigitalOcean Cloud',
        region: 'Global',
      },
    ];
  },
};
