import { InsightProvider, Insight } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { BinaryAdapter } from '#infra/adapters/intelligence-adapter';

const VALID_IDENTITY_TYPES = new Set([
  'residential',
  'business',
  'hosting',
  'datacenter',
  'cellular',
] as const);

type ValidIdentityType = 'residential' | 'business' | 'hosting' | 'datacenter' | 'cellular';

export class BinaryProvider implements InsightProvider {
  name = 'BinaryIntelligence';

  constructor(private adapter: BinaryAdapter) {}

  async init(buffer: Uint8Array) {
    await this.adapter.init(buffer);
  }

  async get(ip: string): Promise<Result<Insight, InsightError>> {
    try {
      const result = this.adapter.lookup(ip);

      const insight: Insight = { ip };
      let hasData = false;

      if (result.identity) {
        hasData = true;
        // Map binary 'identity' type to 'datacenter'; validate all others against the allowlist.
        const rawType = result.identity.type === 'identity' ? 'datacenter' : result.identity.type;
        const type: ValidIdentityType | undefined = VALID_IDENTITY_TYPES.has(
          rawType as ValidIdentityType,
        )
          ? (rawType as ValidIdentityType)
          : undefined;

        insight.identity = {
          type,
          provider: {
            slug: result.identity.slug ?? '',
            service: result.identity.service ?? '',
            region: result.identity.region ?? '',
            name: result.identity.slug ?? '',
          },
        };
      }

      if (result.reputation) {
        hasData = true;
        const category = result.reputation.category ?? '';

        insight.security = {
          is_threat: true,
          sources: [
            {
              slug: category,
              name: category,
              category: category.includes('proxy') ? 'proxy' : 'reputation',
            },
          ],
        };

        const isTor = category.includes('tor');
        const isVpn = category.includes('vpn');
        const isProxy =
          category.includes('proxy') || category.includes('socks') || category.includes('http');

        if (isTor || isVpn || isProxy) {
          insight.security = {
            ...insight.security,
            is_anonymous: true,
            is_tor: isTor,
            is_vpn: isVpn,
            is_proxy: isProxy,
          };
        }
      }

      if (result.whois) {
        hasData = true;
        insight.infrastructure = { ...insight.infrastructure, ...result.whois };
      }

      // Support for future location/network expansion in binary format
      if ('location' in result && result.location) {
        hasData = true;
        insight.location = result.location;
      }

      if ('network' in result && result.network) {
        hasData = true;
        insight.infrastructure = { ...insight.infrastructure, ...result.network };
      }

      return hasData
        ? Result.ok(insight)
        : Result.err(new InsightError('NOT_FOUND', 'IP not found in binary DB'));
    } catch (err: unknown) {
      return Result.err(
        new InsightError('PROVIDER_ERROR', err instanceof Error ? err.message : String(err)),
      );
    }
  }
}
