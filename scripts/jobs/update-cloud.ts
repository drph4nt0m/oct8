import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'cloud.json');
const PROVIDERS_DIR = path.resolve(process.cwd(), 'scripts/providers');

interface CloudData {
  name: string;
  slug: string;
  domain?: string;
  prefixes: string[]; // flattened list of prefixes for simple lookup?
  // actually for the IdentityProvider to be rich, we need:
  // prefixes: { prefix: string, service?: string, region?: string }[]
  // But RadixTree adds by prefix.
  // Let's store structured data keyed by slug?
  // Or just a flat list of all prefixes with metadata?
  // "aws": { name: "AWS", prefixes: ["1.2.3.0/24"] } <- this was the simple plan.

  // Revised plan for rich context:
  // "aws": {
  //   name: "AWS",
  //   ranges: [ { prefix: "...", region: "...", service: "..." } ]
  // }
}

export async function run() {
  console.log('--- Starting Cloud Identity Update Job ---');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const cloudData: Record<string, any> = {};

  if (!fs.existsSync(PROVIDERS_DIR)) {
    console.warn(`Providers directory not found at ${PROVIDERS_DIR}`);
    return;
  }

  const files = fs.readdirSync(PROVIDERS_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    try {
      const modulePath = path.join(PROVIDERS_DIR, file);
      // Dynamic import needs file URL on Windows, usually fine on Linux but safer
      const mod = await import(pathToFileURL(modulePath).href);

      if (mod.scraper) {
        const scraper = mod.scraper;
        console.log(`Running scraper: ${scraper.name} (${scraper.slug})...`);
        const ranges = await scraper.fetchRanges();

        // Flatten ranges for storage?
        // We want to store it so IdentityProvider can load it efficiently.
        // IdentityProvider iterates headers.

        // Storing as:
        // {
        //   "aws": {
        //     name: "Amazon Web Services",
        //     slug: "aws",
        //     prefixes: [ ...flattened simple strings... ]
        //   }
        // }
        // Wait, if we flatten, we lose region/service info.
        // Let's store:
        // {
        //   "aws": {
        //      name: "...",
        //      prefixes: [ { prefix: "...", region: "...", service: "..." } ]
        //   }
        // }
        // But `IdentityProvider` init logic I wrote earlier expected `prefixes` to be an array of strings?
        // Let's check `src/lib/providers/identity.ts`.
        // It iterates `providerInfo.prefixes`.
        // I should update IdentityProvider to handle objects or just store simple prefixes for now
        // OR update `IdentityProvider` to be smarter.

        // For verify step "Detailed Identity", let's try to keep region/service.
        // But for performance/complexity, maybe just keeping it simple for now is safer?
        // The plan said: `service: info.service`

        // Let's store it as specific objects and update IdentityProvider to handle it.
        cloudData[scraper.slug] = {
          name: scraper.name,
          domain: scraper.domain, // if scraper has it
          prefixes: ranges.flatMap((r: any) =>
            r.prefixes.map((p: string) => ({
              prefix: p,
              region: r.region,
              service: r.service,
            })),
          ),
        };
        console.log(
          `Fetched ${cloudData[scraper.slug].prefixes.length} ranges for ${scraper.slug}`,
        );
      }
    } catch (error) {
      console.error(`Failed to run scraper ${file}:`, error);
    }
  }

  // To save space, we might want to optimize, but JSON is fine for MVP.
  // Actually, wait. `IdentityProvider` logic I wrote earlier:
  // for (const prefix of providerInfo.prefixes) { this.tree.add(prefix, ... ) }
  // If `prefixes` is an array of objects, `this.tree.add` first arg must be string.
  // So I WILL need to update IdentityProvider.

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cloudData, null, 2));
  console.log(`Saved cloud identity data to ${OUTPUT_FILE}`);
  console.log('--- Cloud Identity Update Job Complete ---');
}
