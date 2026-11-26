import { Config, ConfigSchema } from './schema';
import { ConfigError } from '#core/errors';
import { logger } from '#infra/logger/logger';

export class ConfigService {
  private config: Config;

  constructor(env: unknown) {
    const parsed = ConfigSchema.safeParse(env);

    if (!parsed.success) {
      const errorMsg = `❌ Invalid configuration: ${JSON.stringify(parsed.error.format(), null, 2)}`;
      logger.error(errorMsg);
      throw new ConfigError(errorMsg);
    }

    this.config = parsed.data;
  }

  public get(): Config {
    return this.config;
  }
}
