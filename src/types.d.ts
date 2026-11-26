import 'hono';
import { Logger } from './infra/logger/logger';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    logger: Logger;
    insightService: import('./services/cached-insight-service').CachedInsightService;
  }
}
