import { Env } from 'hono';
import { Config } from '#infra/config/schema';
import { CachedInsightService } from '#services/cached-insight-service';

export interface AnalyticsEngine {
  writeDataPoint(data: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

export interface AppEnv extends Env {
  Bindings: Config & {
    ANALYTICS?: AnalyticsEngine;
    [key: string]: unknown;
  };
  Variables: {
    insightService: CachedInsightService;
    requestId: string;
  };
}
