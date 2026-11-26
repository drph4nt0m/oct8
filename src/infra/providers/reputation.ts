import { InsightProvider, Insight, SecurityData } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { RadixTree } from '#core/entities/radix-tree';
import { logger } from '#infra/logger/logger';

// Mappings from slug to our internal flags
const SOURCE_MAP: Record<string, { type: 'tor' | 'proxy' | 'threat'; name: string; url: string }> =
  {
    firehol_level1: {
      type: 'threat',
      name: 'FireHOL Level 1',
      url: 'https://iplists.firehol.org/?ipset=firehol_level1',
    },
    firehol_proxies: {
      type: 'proxy',
      name: 'Open Proxies',
      url: 'https://iplists.firehol.org/?ipset=firehol_proxies',
    },
    tor_exits: {
      type: 'tor',
      name: 'Tor Exit Nodes',
      url: 'https://iplists.firehol.org/?ipset=tor_exits',
    },
  };

export class ReputationProvider implements InsightProvider {
  name = 'FireHOL Reputation';
  private tree = new RadixTree<string[]>();

  async init(dataBuffer?: Uint8Array) {
    if (!dataBuffer) {
      logger.warn('Reputation data not provided');
      return;
    }

    try {
      const data = JSON.parse(new TextDecoder().decode(dataBuffer));
      let count = 0;

      for (const [slug, ips] of Object.entries(data)) {
        if (!Array.isArray(ips)) continue;
        for (const ip of ips) {
          if (typeof ip !== 'string') continue;
          // Store an array of slugs in the tree.
          // If an IP is in multiple lists, we append.
          const existing = this.tree.get(ip);
          if (existing) {
            // If existing is not array (simple value), make it array
            if (Array.isArray(existing)) {
              existing.push(slug);
            } else {
              this.tree.add(ip, [existing, slug]); // Should not happen if strictly typed, but safety
            }
          } else {
            this.tree.add(ip, [slug]);
          }
          count++;
        }
      }
      logger.info(`Reputation Provider loaded ${count} entries.`);
    } catch (error: unknown) {
      logger.error(
        'Error loading reputation data:',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async get(
    ip: string,
    _headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    const lookup = this.tree.get(ip);

    if (!lookup) {
      return Result.err(new InsightError('NOT_FOUND', 'IP not found in reputation DB'));
    }

    // lookup is string[] of slugs, e.g. ['tor_exits', 'firehol_level1']
    const slugs = lookup;

    const security: SecurityData = {
      is_anonymous: false,
      is_proxy: false,
      is_tor: false,
      is_vpn: false,
      is_threat: false,
      sources: [],
    };

    for (const slug of slugs) {
      const info = SOURCE_MAP[slug];
      if (!info) continue;

      if (info.type === 'tor') {
        security.is_tor = true;
        security.is_anonymous = true;
      }
      if (info.type === 'proxy') {
        security.is_proxy = true;
        security.is_anonymous = true;
      }
      if (info.type === 'threat') {
        security.is_threat = true;
        security.sources?.push({
          slug,
          name: info.name,
          category: 'blocklist',
          url: info.url,
        });
      }
    }

    return Result.ok({
      ip,
      security,
    });
  }
}
