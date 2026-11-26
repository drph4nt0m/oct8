import { InsightProvider, Insight, IdentityData } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { RadixTree } from '#core/entities/radix-tree';
import { logger } from '#infra/logger/logger';

interface ProviderInfo {
  name: string;
  domain?: string;
  prefixes: Array<{
    prefix: string;
    region?: string;
    service?: string;
  }>;
}

export class IdentityProvider implements InsightProvider {
  name = 'Cloud Identity';
  private tree = new RadixTree<{
    slug: string;
    name: string;
    domain?: string;
    service?: string;
    region?: string;
  }>();

  async init(dataBuffer?: Uint8Array) {
    if (!dataBuffer) {
      logger.warn('Cloud Identity data not provided');
      return;
    }

    try {
      const data = JSON.parse(new TextDecoder().decode(dataBuffer));
      let count = 0;

      // Data format: { "aws": { name: "AWS", prefixes: ["1.2.3.0/24"] }, ... }
      for (const [slug, info] of Object.entries(data)) {
        if (typeof info !== 'object' || info === null || !('prefixes' in info)) continue;
        const providerInfo = info as ProviderInfo;
        for (const item of providerInfo.prefixes) {
          // item is { prefix: string, region?: string, service?: string }

          this.tree.add(item.prefix, {
            slug,
            name: providerInfo.name,
            domain: providerInfo.domain,
            service: item.service,
            region: item.region,
          });
          count++;
        }
      }
      logger.info(`Identity Provider loaded ${count} prefixes.`);
    } catch (error: unknown) {
      logger.error(
        'Error loading cloud identity data:',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async get(
    ip: string,
    _headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    const info = this.tree.get(ip);

    if (!info) {
      return Result.err(new InsightError('NOT_FOUND', 'IP not found in identity DB'));
    }

    // info is { slug, name, domain, ... }
    const identity: IdentityData = {
      type: 'datacenter', // Cloud IPs are generally datacenter
      provider: {
        name: info.name,
        slug: info.slug,
        domain: info.domain,
        service: info.service,
        region: info.region,
      },
    };

    return Result.ok({
      ip,
      identity,
    });
  }
}
