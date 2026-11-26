import { InsightProvider } from '#core/entities/types';
import { MaxMindProvider } from '#infra/providers/maxmind';
import { ReputationProvider } from '#infra/providers/reputation';
import { IdentityProvider } from '#infra/providers/identity';
import { BinaryAdapter } from '#infra/adapters/intelligence-adapter';
import { HeaderAdapter } from '#infra/adapters/GeoAdapter';
import { BinaryProvider } from '#infra/providers/binary-provider';
import { HeaderProvider } from '#infra/providers/header-provider';
import { Config } from '#infra/config/schema';
import { Logger } from '#infra/logger/logger';
import { IDataSource } from '#core/interfaces/data-source';
import { CircuitBreakerProvider } from '#infra/providers/circuit-breaker-provider';
import { WhoisProvider } from '#infra/providers/whois-provider';
import { ReverseDnsProvider } from '#infra/providers/rdns-provider';

export class ProviderFactory {
  constructor(
    private config: Config,
    private logger: Logger,
    private dataSource: IDataSource,
  ) {}

  async createProviders(): Promise<InsightProvider[]> {
    const providers: InsightProvider[] = [];

    // Mode determination logic could be enhanced to check dataSource presence
    let mode = this.config.MODE;
    const hasBinary = await this.dataSource.has(this.config.INSIGHT_BINARY_FILE);

    if (mode === 'auto') {
      mode = hasBinary ? 'binary' : 'legacy';
    }

    if (mode === 'binary') {
      this.logger.info('[ProviderFactory] Using Optimized Binary Mode');
      const binaryData = await this.dataSource.load(this.config.INSIGHT_BINARY_FILE);
      if (binaryData) {
        const adapter = new BinaryAdapter();
        await adapter.init(binaryData);
        providers.push(new BinaryProvider(adapter));
      } else {
        this.logger.error('[ProviderFactory] Binary mode selected but data not found');
      }

      // Check for MaxMind or fall back to Headers
      const cityData = this.config.MAXMIND_CITY_FILE
        ? await this.dataSource.load(this.config.MAXMIND_CITY_FILE)
        : null;
      const asnData = this.config.MAXMIND_ASN_FILE
        ? await this.dataSource.load(this.config.MAXMIND_ASN_FILE)
        : null;

      if (cityData || asnData) {
        const mmProvider = new MaxMindProvider(this.logger);
        await mmProvider.init(cityData || undefined, asnData || undefined);
        providers.push(new CircuitBreakerProvider(mmProvider, this.logger));
      } else {
        providers.push(new HeaderProvider(new HeaderAdapter()));
      }

      const rdnsProvider = new ReverseDnsProvider();
      await rdnsProvider.init();
      providers.push(new CircuitBreakerProvider(rdnsProvider, this.logger));
    } else {
      this.logger.info('[ProviderFactory] Using Standard Legacy Mode');

      const mmProvider = new MaxMindProvider(this.logger);
      const cityData = this.config.MAXMIND_CITY_FILE
        ? await this.dataSource.load(this.config.MAXMIND_CITY_FILE)
        : null;
      const asnData = this.config.MAXMIND_ASN_FILE
        ? await this.dataSource.load(this.config.MAXMIND_ASN_FILE)
        : null;
      await mmProvider.init(cityData || undefined, asnData || undefined);
      providers.push(new CircuitBreakerProvider(mmProvider, this.logger));

      const repProvider = new ReputationProvider();
      const repData = await this.dataSource.load('reputation.json');
      await repProvider.init(repData || undefined);
      providers.push(new CircuitBreakerProvider(repProvider, this.logger));

      const idProvider = new IdentityProvider();
      const idData = await this.dataSource.load('cloud.json');
      await idProvider.init(idData || undefined);
      providers.push(new CircuitBreakerProvider(idProvider, this.logger));

      const whoisProvider = new WhoisProvider();
      const whoisData = await this.dataSource.load('whois.json');
      await whoisProvider.init(whoisData || undefined);
      providers.push(new CircuitBreakerProvider(whoisProvider, this.logger));

      const rdnsProvider = new ReverseDnsProvider();
      await rdnsProvider.init();
      providers.push(new CircuitBreakerProvider(rdnsProvider, this.logger));
    }

    return providers;
  }
}
