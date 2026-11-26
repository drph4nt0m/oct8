import { InsightProvider, Insight, InfrastructureData } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { RadixTree } from '#core/entities/radix-tree';
import { logger } from '#infra/logger/logger';

export class WhoisProvider implements InsightProvider {
  name = 'RIR Whois';
  private tree = new RadixTree<InfrastructureData>();

  async init(dataBuffer?: Uint8Array) {
    if (!dataBuffer) {
      logger.warn('Whois data not provided');
      return;
    }

    try {
      const data = JSON.parse(new TextDecoder().decode(dataBuffer));
      let count = 0;

      for (const [cidr, info] of Object.entries(data)) {
        if (typeof info !== 'object' || info === null) continue;

        this.tree.add(cidr, info as InfrastructureData);
        count++;
      }
      logger.info(`Whois Provider loaded ${count} CIDR blocks.`);
    } catch (error: unknown) {
      logger.error(
        'Error loading whois data:',
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
      return Result.err(new InsightError('NOT_FOUND', 'IP not found in whois DB'));
    }

    return Result.ok({
      ip,
      infrastructure: info,
    });
  }
}
