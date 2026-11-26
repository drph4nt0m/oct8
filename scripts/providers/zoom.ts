// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Zoom',
  slug: 'zoom',
  async fetchRanges() {
    console.log('Fetching Zoom IP ranges...');
    // Zoom splits across multiple files, but 'Zoom.txt' is the main one.
    // For completeness, we could fetch Meetings/Phone/CDN, but let's start with general Zoom.txt and Meetings.
    const urls = [
      'https://assets.zoom.us/docs/ipranges/Zoom.txt',
      'https://assets.zoom.us/docs/ipranges/ZoomMeetings.txt',
      'https://assets.zoom.us/docs/ipranges/ZoomCDN.txt',
    ];

    const allPrefixes: string[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Valid CIDR check (loose)
          if (trimmed && (trimmed.includes('/') || trimmed.match(/^\d+\.\d+\.\d+\.\d+$/))) {
            allPrefixes.push(trimmed);
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch Zoom ranges from ${url}`, e);
      }
    }

    return [
      {
        prefixes: [...new Set(allPrefixes)], // dedupe
        service: 'Zoom',
        region: 'Global',
      },
    ];
  },
};
