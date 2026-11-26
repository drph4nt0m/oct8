import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ProviderFactory } from '#infra/providers/provider-factory';
import { Result } from '#core/result';
import { Config } from '#infra/config/schema';
import { Logger } from '#infra/logger/logger';
// fs and path removed
// InsightProvider removed
import { IDataSource } from '#core/interfaces/data-source';
import * as IntelligenceAdapterModule from '#infra/adapters/intelligence-adapter';
import * as BinaryProviderModule from '#infra/providers/binary-provider';
import { BinaryAdapter } from '#infra/adapters/intelligence-adapter';
import { BinaryProvider } from '#infra/providers/binary-provider';

// Mock fs
vi.mock('node:fs');

describe('ProviderFactory', () => {
  let mockLogger: Logger;
  let mockConfig: Config;
  let mockDataSource: IDataSource;

  beforeEach(() => {
    vi.resetAllMocks();

    // Spy on BinaryAdapter - Use function() to be constructible
    vi.spyOn(IntelligenceAdapterModule, 'BinaryAdapter').mockImplementation(function () {
      return {
        init: async () => {},
        lookup: vi.fn(),
      } as Partial<BinaryAdapter> as BinaryAdapter;
    });

    // Spy on BinaryProvider - Use function() to be constructible
    vi.spyOn(BinaryProviderModule, 'BinaryProvider').mockImplementation(function (
      _adapter: BinaryAdapter,
    ) {
      return {
        name: 'BinaryIntelligence',
        init: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(Result.ok({ ip: '1.2.3.4' })),
      } as Partial<BinaryProvider> as BinaryProvider;
    });

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };
    mockConfig = {
      PORT: 3000,
      LOG_LEVEL: 'info',
      DATA_DIR: 'data',
      INSIGHT_BINARY_FILE: 'insight.bin',
      MAXMIND_CITY_FILE: 'GeoLite2-City.mmdb',
      MAXMIND_ASN_FILE: 'GeoLite2-ASN.mmdb',
      MODE: 'auto',
    };
    mockDataSource = {
      has: vi.fn(),
      load: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use binary mode when mode is "auto" and binary file exists', async () => {
    (mockDataSource.has as Mock).mockImplementation((key: string) => key.endsWith('insight.bin'));
    (mockDataSource.load as Mock).mockResolvedValue(new Uint8Array(10));

    const factory = new ProviderFactory(mockConfig, mockLogger, mockDataSource);
    const providers = await factory.createProviders();

    expect(providers.length).toBeGreaterThan(0);
    // Should have BinaryProvider
    const binaryProvider = providers.find((p) => p.name === 'BinaryIntelligence');
    expect(binaryProvider).toBeDefined();

    // Should NOT have ReputationProvider (legacy)
    const reputationProvider = providers.find(
      (p) => p.name === 'CircuitBreaker(FireHOL Reputation)',
    );
    expect(reputationProvider).toBeUndefined();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Optimized Binary Mode'));
  });

  it('should use legacy mode when mode is "auto" and binary file does NOT exist', async () => {
    (mockDataSource.has as Mock).mockReturnValue(false);

    const factory = new ProviderFactory(mockConfig, mockLogger, mockDataSource);
    const providers = await factory.createProviders();

    expect(providers.length).toBeGreaterThan(0);
    // Should have MaxMindProvider
    const maxMindProvider = providers.find((p) => p.name === 'CircuitBreaker(MaxMind)');
    expect(maxMindProvider).toBeDefined();

    // Should have ReputationProvider
    const reputationProvider = providers.find(
      (p) => p.name === 'CircuitBreaker(FireHOL Reputation)',
    );
    expect(reputationProvider).toBeDefined();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Standard Legacy Mode'));
  });

  it('should force binary mode when mode is "binary"', async () => {
    mockConfig.MODE = 'binary';
    (mockDataSource.load as Mock).mockResolvedValue(new Uint8Array(10));

    const factory = new ProviderFactory(mockConfig, mockLogger, mockDataSource);
    const providers = await factory.createProviders();

    const binaryProvider = providers.find((p) => p.name === 'BinaryIntelligence');
    expect(binaryProvider).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Optimized Binary Mode'));
  });

  it('should include HeaderProvider if MaxMind DB is missing in binary mode', async () => {
    mockConfig.MODE = 'binary';
    // Load returns null for MaxMind files
    (mockDataSource.load as Mock).mockImplementation(async (key: string) => {
      if (key && key.endsWith('insight.bin')) return new Uint8Array(10);
      return null;
    });

    const factory = new ProviderFactory(mockConfig, mockLogger, mockDataSource);
    const providers = await factory.createProviders();

    const headerProvider = providers.find((p) => p.name === 'EdgeGeo');
    expect(headerProvider).toBeDefined();

    // Should also have BinaryProvider
    const binaryProvider = providers.find((p) => p.name === 'BinaryIntelligence');
    expect(binaryProvider).toBeDefined();
  });

  it('should include MaxMindProvider if MaxMind DB exists in legacy mode', async () => {
    mockConfig.MODE = 'legacy';
    (mockDataSource.has as Mock).mockImplementation((key: string) =>
      key.endsWith('GeoLite2-City.mmdb'),
    );

    const factory = new ProviderFactory(mockConfig, mockLogger, mockDataSource);
    const providers = await factory.createProviders();

    const maxMindProvider = providers.find((p) => p.name === 'CircuitBreaker(MaxMind)');
    expect(maxMindProvider).toBeDefined();
  });
});
