import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { InsightService } from '#services/insight-service';
import { Result } from '#core/result';
import { InsightProvider } from '#core/entities/types';
import { Logger } from '#infra/logger/logger';
import { IVpnRepository } from '#core/interfaces/vpn-repository';
import { MockInsightProvider, MockLogger, MockVpnRepo } from '#tests/test-types';

// Mock Provider
const mockProvider: MockInsightProvider = {
  name: 'MockProvider',
  init: vi.fn(),
  get: vi.fn(),
};

// Mock VPN Repo
const mockVpnRepo: MockVpnRepo = {
  isVpnProvider: vi.fn().mockResolvedValue(false),
};

// Mock Logger
const mockLogger: MockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

describe('InsightService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs initialization', async () => {
    const service = new InsightService(
      [mockProvider as InsightProvider],
      mockLogger as Logger,
      mockVpnRepo as IVpnRepository,
    );
    await service.init();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Insight Engine initialized'),
    );
  });

  it('aggregates results from providers', async () => {
    const service = new InsightService(
      [mockProvider as InsightProvider],
      mockLogger as Logger,
      mockVpnRepo as IVpnRepository,
    );
    (mockProvider.get as Mock).mockResolvedValue(
      Result.ok({
        ip: '1.2.3.4',
        location: { country: 'Testland' },
      }),
    );

    const result = await service.get('1.2.3.4');
    expect(result.location?.country).toBe('Testland');
    expect(result.ip).toBe('1.2.3.4');
  });

  it('merges multiple provider results correctly', async () => {
    const provider1: MockInsightProvider = { ...mockProvider, get: vi.fn() };
    const provider2: MockInsightProvider = { ...mockProvider, get: vi.fn() };

    (provider1.get as Mock).mockResolvedValue(
      Result.ok({
        ip: '1.2.3.4',
        location: { country: 'Country1' },
        infrastructure: { asn: 123 },
      }),
    );

    (provider2.get as Mock).mockResolvedValue(
      Result.ok({
        ip: '1.2.3.4',
        location: { city: 'City2' },
        security: { is_threat: true, sources: [] },
      }),
    );

    const service = new InsightService(
      [provider1 as InsightProvider, provider2 as InsightProvider],
      mockLogger as Logger,
      mockVpnRepo as IVpnRepository,
    );
    const result = await service.get('1.2.3.4');

    expect(result.location?.country).toBe('Country1');
    expect(result.location?.city).toBe('City2');
    expect(result.infrastructure?.asn).toBe(123);
    expect(result.security?.is_threat).toBe(true);
  });

  it('detects VPN usage via repository', async () => {
    const service = new InsightService(
      [mockProvider as InsightProvider],
      mockLogger as Logger,
      mockVpnRepo as IVpnRepository,
    );
    (mockProvider.get as Mock).mockResolvedValue(
      Result.ok({
        ip: '1.2.3.4',
        infrastructure: { org: 'SomeVPN Corp' },
      }),
    );
    (mockVpnRepo.isVpnProvider as Mock).mockResolvedValue(true);

    const result = await service.get('1.2.3.4');

    expect(mockVpnRepo.isVpnProvider).toHaveBeenCalledWith('SomeVPN Corp');
    expect(result.security?.is_vpn).toBe(true);
  });
});
