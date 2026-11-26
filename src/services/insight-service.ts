import { Insight, InsightProvider } from '#core/entities/types';
import { Logger } from '#infra/logger/logger';
import { IVpnRepository } from '#core/interfaces/vpn-repository';

export class InsightService {
  constructor(
    private providers: InsightProvider[],
    private logger: Logger,
    private vpnRepo: IVpnRepository,
  ) {}

  async init() {
    this.logger.info(`Insight Engine initialized with ${this.providers.length} providers.`);
  }

  async get(ip: string, headers?: Record<string, string | undefined>): Promise<Insight> {
    const combined: Insight = {
      ip,
      location: {},
      infrastructure: {},
      identity: { type: undefined },
      security: {
        is_anonymous: false,
        is_proxy: false,
        is_tor: false,
        is_vpn: false,
        is_threat: false,
        sources: [],
      },
    };

    let successCount = 0;

    // Parallelize lookups - providers catch their own errors and return Result.err
    const results = await Promise.all(this.providers.map((p) => p.get(ip, headers)));

    for (const result of results) {
      if (result.isErr()) {
        const err = result.error;
        // Log errors but continue. 'NOT_FOUND' is expected and often debug level only.
        if (err.code !== 'NOT_FOUND') {
          this.logger.error(`[InsightService] Provider error: ${err.message}`, err);
        }
        continue;
      }

      const partial = result.value;
      successCount++;
      if (partial.location) combined.location = { ...combined.location, ...partial.location };
      if (partial.infrastructure)
        combined.infrastructure = { ...combined.infrastructure, ...partial.infrastructure };

      if (partial.identity) {
        combined.identity = {
          ...combined.identity,
          ...partial.identity,
        };
      }

      if (partial.security) {
        combined.security = {
          ...combined.security,
          ...partial.security,
          is_anonymous: combined.security?.is_anonymous || partial.security.is_anonymous || false,
          is_threat: combined.security?.is_threat || partial.security.is_threat || false,
          sources: [...(combined.security?.sources || []), ...(partial.security.sources || [])],
        };
      }
    }

    // Post-processing: Heuristic VPN detection based on Org name
    if (combined.infrastructure?.org) {
      const org = combined.infrastructure.org; // Repository handles normalization if needed

      if (await this.vpnRepo.isVpnProvider(org)) {
        combined.security = {
          ...combined.security,
          is_anonymous: true,
          is_vpn: true,
        };
      }
    }

    if (successCount === 0 && this.providers.length > 0) {
      this.logger.warn('[InsightService] All providers failed or returned no data.');
    }

    return combined;
  }
}
