// CloudProviderScraper interface defined locally to avoid import loops/complexities in script runner

// TypeScript might complain if I don't import the shared interface or define it.
// To be clean, I should probably move the interface to a shared file, but for now defining it to match is fine or importing from 'aws' if valid.
// `gcp.ts` defined it inline (I duplicated it).
// Let's define it inline here too to be self-contained for this script-based approach,
// or arguably I should have put it in `scripts/types.ts`.
// I'll define inline to avoid import mess in `scripts/` if `tsconfig` is strict about paths.

export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'Microsoft Azure',
  slug: 'azure',
  async fetchRanges() {
    console.log('Fetching Azure IP ranges...');
    // Using community mirror for stability
    const url =
      'https://raw.githubusercontent.com/maciejporebski/azure-ips/master/ServiceTags_Public_Latest.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch Azure ranges: ${res.statusText}`);

    const data = await res.json();
    // data.values = [ { properties: { addressPrefixes: [...], region: "...", systemService: "..." } } ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.values.map((v: any) => ({
      prefixes: v.properties.addressPrefixes || [],
      region: v.properties.region,
      service: v.properties.systemService || 'Azure',
    }));
  },
};
