import { scraper as salesforce } from './providers/salesforce';
import { scraper as vultr } from './providers/vultr';
import { scraper as digitalocean } from './providers/digitalocean';

async function debug() {
  console.log('--- Debugging Salesforce ---');
  try {
    const sfRanges = await salesforce.fetchRanges();
    console.log(
      `Salesforce found: ${sfRanges.reduce((acc, i) => acc + i.prefixes.length, 0)} prefixes`,
    );
    if (sfRanges.length === 0) {
      console.log('Salesforce returned 0 prefixes. Fetching raw URL to inspect...');
      const res = await fetch('https://ip-ranges.salesforce.com/ip-ranges.json');
      const text = await res.text();
      console.log('Salesforce RAW preview:', text.substring(0, 500));
    }
  } catch (e) {
    console.error('Salesforce error:', e);
  }

  console.log('\n--- Debugging Vultr ---');
  try {
    const vultrRanges = await vultr.fetchRanges();
    console.log(
      `Vultr found: ${vultrRanges.reduce((acc, i) => acc + i.prefixes.length, 0)} prefixes`,
    );
    if (
      vultrRanges.length === 0 ||
      (vultrRanges.length > 0 && vultrRanges[0].prefixes.length === 0)
    ) {
      console.log('Vultr returned empty/zero. Fetching raw to inspect...');
      const res = await fetch('https://geofeed.constant.com/?json');
      const text = await res.text();
      console.log('Vultr RAW preview:', text.substring(0, 500));
    }
  } catch (e) {
    console.error('Vultr error:', e);
  }

  console.log('\n--- Debugging DigitalOcean ---');
  try {
    const doRanges = await digitalocean.fetchRanges();
    console.log(
      `DigitalOcean found: ${doRanges.reduce((acc, i) => acc + i.prefixes.length, 0)} prefixes`,
    );
  } catch (e) {
    console.error('DigitalOcean error:', e);
  }
}

debug();
