import { InsightProvider, Insight } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { HeaderAdapter } from '#infra/adapters/GeoAdapter';

export class HeaderProvider implements InsightProvider {
  name = 'EdgeGeo';
  constructor(private adapter: HeaderAdapter) {}

  async init() {
    /* no-op */
  }

  async get(
    ip: string,
    headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    // Only return data if the IP matches the request IP (checked by adapter or controller logic)
    // The adapter now relies on headers being passed.

    // Check if we have headers, if not, we can't do anything for this provider
    if (!headers) {
      return Result.err(new InsightError('MISSING_HEADERS', 'No headers provided'));
    }

    try {
      const loc = await this.adapter.lookup(ip, headers);
      if (!loc) {
        return Result.err(new InsightError('NOT_FOUND', 'IP not found in headers'));
      }

      return Result.ok({
        ip,
        location: loc,
      });
    } catch (err: unknown) {
      return Result.err(
        new InsightError('PROVIDER_ERROR', err instanceof Error ? err.message : String(err)),
      );
    }
  }
}
