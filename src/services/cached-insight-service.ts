import { Insight } from '#core/entities/types';
import { InsightService } from '#services/insight-service';
import { LRUCache } from 'lru-cache';

export class CachedInsightService {
  private cache: LRUCache<string, Insight>;

  constructor(private service: InsightService) {
    // NOTE: This LRU cache is isolate-scoped — it warms up within a single Cloudflare Workers
    // isolate instance and is NOT shared across the edge or across isolate recyclings.
    // For persistent cross-request caching, the CF Cache API layer in ip-controller.ts
    // is the authoritative cache. This LRU layer only benefits repeated lookups within
    // the same warm isolate.
    this.cache = new LRUCache<string, Insight>({
      max: 5000,
      ttl: 1000 * 60 * 60, // 1 hour
    });
  }

  async init() {
    await this.service.init();
  }

  async get(ip: string, headers?: Record<string, string | undefined>): Promise<Insight> {
    const normalizedIp = ip.replace(/^::ffff:/i, '');

    const cached = this.cache.get(normalizedIp);
    if (cached !== undefined) {
      return cached;
    }

    const result = await this.service.get(normalizedIp, headers);

    // Only cache if we have some meaningful data?
    // For now cache everything to avoid re-computation.
    if (result) {
      this.cache.set(normalizedIp, result);
    }

    return result;
  }
}
