// CloudProviderScraper interface defined locally
export interface CloudProviderScraper {
  name: string;
  slug: string;
  fetchRanges(): Promise<{ prefixes: string[]; service?: string; region?: string }[]>;
}

export const scraper: CloudProviderScraper = {
  name: 'GitHub',
  slug: 'github',
  async fetchRanges() {
    console.log('Fetching GitHub IP ranges...');
    const url = 'https://api.github.com/meta';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch GitHub ranges: ${res.statusText}`);

    const data = await res.json();
    // data.actions (and potentially others like hooks, git, etc.)
    // We can include all, or just actions. The 'actions' list is most relevant for "is this a bot?"
    // Let's grab 'actions' specifically, or maybe separate services?
    // InsightProvider flattened approach expects list of ranges.
    // Let's categorize by service if possible, but map to flattened list for simplicty in `fetchRanges` return type structure.

    // We can return multiple entries for different services
    const results = [];

    if (data.actions) {
      results.push({
        prefixes: data.actions,
        service: 'GitHub Actions',
        region: 'Global',
      });
    }

    if (data.hooks) {
      results.push({
        prefixes: data.hooks,
        service: 'GitHub Hooks',
        region: 'Global',
      });
    }

    if (data.git) {
      results.push({
        prefixes: data.git,
        service: 'GitHub Git',
        region: 'Global',
      });
    }

    return results;
  },
};
