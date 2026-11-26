import { InsightProvider, Insight } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { IPUtils } from '#core/utils/ip-utils';
import { logger } from '#infra/logger/logger';

export class ReverseDnsProvider implements InsightProvider {
  name = 'Cloudflare DoH rDNS';

  async init(..._args: unknown[]): Promise<void> {
    // No initialization needed for pure fetch provider
    logger.info('ReverseDnsProvider initialized');
  }

  async get(
    ip: string,
    _headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    const reverseDomain = IPUtils.ipToReverseDomain(ip);

    if (!reverseDomain) {
      return Result.err(
        new InsightError('INVALID_IP', `Cannot construct reverse domain for ${ip}`),
      );
    }

    try {
      const url = `https://1.1.1.1/dns-query?name=${reverseDomain}&type=PTR`;
      const response = await fetch(url, {
        headers: {
          accept: 'application/dns-json',
        },
      });

      if (!response.ok) {
        return Result.err(new InsightError('PROVIDER_ERROR', `DoH returned ${response.status}`));
      }

      const data = (await response.json()) as { Answer?: Array<{ data: string }> };

      if (data.Answer && data.Answer.length > 0) {
        let hostname = data.Answer[0].data;
        // Trim trailing dot if present
        if (hostname.endsWith('.')) {
          hostname = hostname.slice(0, -1);
        }
        return Result.ok({
          ip,
          infrastructure: {
            reverse_dns: hostname,
          },
        });
      }

      return Result.err(new InsightError('NOT_FOUND', 'No PTR record found'));
    } catch (err: unknown) {
      return Result.err(
        new InsightError('PROVIDER_ERROR', err instanceof Error ? err.message : String(err)),
      );
    }
  }
}
