import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { ProviderFactory } from '#infra/providers/provider-factory';
import { Config } from '#infra/config/schema';
import { Logger } from '#infra/logger/logger';
import { IDataSource } from '#core/interfaces/data-source';
import { InsightProvider } from '#core/entities/types';
import { MockConfig, MockLogger } from '#tests/test-types';

class TestDataSource implements IDataSource {
  constructor(private dataDir: string) {}

  async has(key: string): Promise<boolean> {
    const filePath = path.join(this.dataDir, key);
    return fs.existsSync(filePath);
  }

  async load(key: string): Promise<Uint8Array | null> {
    const filePath = path.join(this.dataDir, key);
    try {
      if (!fs.existsSync(filePath)) return null;
      return new Uint8Array(await fs.promises.readFile(filePath));
    } catch {
      return null;
    }
  }
}

// Mock Config and Logger
const mockConfig: MockConfig = {
  DATA_DIR: 'src/tests/integration/data',
  INSIGHT_BINARY_FILE: 'insight.bin',
  MAXMIND_CITY_FILE: 'GeoLite2-City.mmdb',
  MAXMIND_ASN_FILE: 'GeoLite2-ASN.mmdb',
  MODE: 'auto',
};

const mockLogger: MockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

describe('ProviderFactory Integration', () => {
  // Safe to assert ! here as we define it in the mock above
  const testDataDir = path.resolve(process.cwd(), mockConfig.DATA_DIR!);

  beforeEach(() => {
    // Create test data directory if not exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  it('should default to legacy mode (MaxMind + Reputation + Identity) when binary file is missing', async () => {
    const dataSource = new TestDataSource(path.resolve(process.cwd(), mockConfig.DATA_DIR!));
    // We cast to the real types for the factory, but we used safer mock types for definition
    const factory = new ProviderFactory(mockConfig as Config, mockLogger as Logger, dataSource);
    const providers = await factory.createProviders();

    expect(providers).toHaveLength(5);
    expect(providers[0].name).toBe('CircuitBreaker(MaxMind)');
    expect(providers[1].name).toBe('CircuitBreaker(FireHOL Reputation)');
    expect(providers[2].name).toBe('CircuitBreaker(Cloud Identity)');
    expect(providers[3].name).toBe('CircuitBreaker(RIR Whois)');
    expect(providers[4].name).toBe('CircuitBreaker(Cloudflare DoH rDNS)');

    expect(mockLogger.info).toHaveBeenCalledWith('[ProviderFactory] Using Standard Legacy Mode');
  });

  it('should switch to binary mode when binary file exists', async () => {
    // Create dummy binary file
    const binaryPath = path.join(testDataDir, mockConfig.INSIGHT_BINARY_FILE!);
    await fs.promises.writeFile(binaryPath, Buffer.alloc(10));

    const dataSource = new TestDataSource(path.resolve(process.cwd(), mockConfig.DATA_DIR!));
    const factory = new ProviderFactory(mockConfig as Config, mockLogger as Logger, dataSource);
    const providers = await factory.createProviders();

    expect(providers.some((p: InsightProvider) => p.name === 'BinaryIntelligence')).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('[ProviderFactory] Using Optimized Binary Mode');
  });

  it('should fallback to HeaderProvider in binary mode if MaxMind DB is missing', async () => {
    // Create dummy binary file
    const binaryPath = path.join(testDataDir, mockConfig.INSIGHT_BINARY_FILE!);
    await fs.promises.writeFile(binaryPath, Buffer.alloc(10));

    // Ensure NO MaxMind DB
    const mmdbPath = path.join(testDataDir, mockConfig.MAXMIND_CITY_FILE!);
    if (fs.existsSync(mmdbPath)) fs.unlinkSync(mmdbPath);

    const dataSource = new TestDataSource(path.resolve(process.cwd(), mockConfig.DATA_DIR!));
    const factory = new ProviderFactory(mockConfig as Config, mockLogger as Logger, dataSource);
    const providers = await factory.createProviders();

    // Expect Binary + Header + rDNS
    expect(providers).toHaveLength(3);
    expect(providers[0].name).toBe('BinaryIntelligence');
    expect(providers[1].name).toBe('EdgeGeo');
    expect(providers[2].name).toBe('CircuitBreaker(Cloudflare DoH rDNS)');
  });
});
