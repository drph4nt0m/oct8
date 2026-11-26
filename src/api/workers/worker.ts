import { InsightService } from '#services/insight-service';
import { ProviderFactory } from '#infra/providers/provider-factory';
import { WorkerDataSource } from '#infra/data-sources/worker-data-source';
import { Config } from '#infra/config/schema';
import { ConfigError } from '#core/errors';
import { ConfigService } from '#infra/config/config-service';
import { IpController } from '#api/http/controllers/ip-controller';
import { LiteController } from '#api/http/controllers/lite-controller';
import { logger } from '#infra/logger/logger';
import { CachedInsightService } from '#services/cached-insight-service';
import { createCoreApp } from '#api/http/app-factory';
import { StaticVpnRepository } from '#infra/repositories/static-vpn-repository';

import { AppEnv } from '#api/http/app-types';

// Use the factory to create the app with typed Bindings
const app = createCoreApp<AppEnv>();

// Isolate-scoped singleton
let serviceInstance: CachedInsightService | null = null;
let initializing: Promise<CachedInsightService> | null = null;
// Tracks the timestamp of the last failed init attempt.
// Prevents thundering-herd reinit storms when R2 or providers are transiently unavailable.
let lastInitError: number | null = null;
const INIT_RETRY_INTERVAL_MS = 5_000;

async function getInsightService(
  env: AppEnv['Bindings'],
  config: Config,
): Promise<CachedInsightService> {
  if (serviceInstance) return serviceInstance;
  if (initializing) return initializing;
  // If the last init attempt failed recently, hold off to avoid a reinit storm.
  if (lastInitError !== null && Date.now() - lastInitError < INIT_RETRY_INTERVAL_MS) {
    throw new ConfigError(
      'Service initialization is cooling down after a recent failure. Retry shortly.',
    );
  }

  initializing = (async () => {
    try {
      const dataSource = new WorkerDataSource(env);
      const factory = new ProviderFactory(config, logger, dataSource);
      const providers = await factory.createProviders();
      const vpnRepo = new StaticVpnRepository();

      const base = new InsightService(providers, logger, vpnRepo);
      const cached = new CachedInsightService(base);
      await cached.init();

      serviceInstance = cached;
      return cached;
    } catch (err: unknown) {
      lastInitError = Date.now();
      throw err;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
}

// Validation / Initialization middleware
app.use(async (c, next) => {
  try {
    const configService = new ConfigService(c.env);
    const config = configService.get();

    // Inject properly typed config
    const service = await getInsightService(c.env, config);
    c.set('insightService', service);
    await next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      `[Middleware Error] ${message}`,
      err instanceof Error ? err : new Error(String(err)),
    );
    const reqId = c.get('requestId') || 'unknown';
    if (err instanceof ConfigError) {
      const retrySeconds = Math.ceil(INIT_RETRY_INTERVAL_MS / 1000);
      c.header('Retry-After', String(retrySeconds));
      return c.json({ error: 'Service Unavailable', message, requestId: reqId }, 503);
    }
    return c.json({ error: 'Initialization Error', message, requestId: reqId }, 500);
  }
});

const controller = new IpController();
controller.registerRoutes(app);

const liteController = new LiteController();
liteController.registerRoutes(app);

export default app;
