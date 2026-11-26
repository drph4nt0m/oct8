import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { CachedInsightService } from '#services/cached-insight-service';
import { InsightService } from '#services/insight-service';
import { Insight } from '#core/entities/types';

describe('CachedInsightService', () => {
  let mockInsightService: InsightService;
  let cachedService: CachedInsightService;

  beforeEach(() => {
    mockInsightService = {
      init: vi.fn(),
      get: vi.fn(),
    } as Partial<InsightService> as InsightService;
    cachedService = new CachedInsightService(mockInsightService);
  });

  it('should call init on underlying service', async () => {
    await cachedService.init();
    expect(mockInsightService.init).toHaveBeenCalled();
  });

  it('should cache results', async () => {
    const mockInsight: Insight = { ip: '1.2.3.4' };
    (mockInsightService.get as Mock).mockResolvedValue(mockInsight);

    // First call - should hit service
    const result1 = await cachedService.get('1.2.3.4');
    expect(result1).toBe(mockInsight);
    expect(mockInsightService.get).toHaveBeenCalledTimes(1);

    // Second call - should hit cache
    const result2 = await cachedService.get('1.2.3.4');
    expect(result2).toBe(mockInsight);
    expect(mockInsightService.get).toHaveBeenCalledTimes(1); // Call count should remain 1
  });

  it('should pass headers to underlying service on miss', async () => {
    const mockInsight: Insight = { ip: '1.2.3.4' };
    (mockInsightService.get as Mock).mockResolvedValue(mockInsight);
    const headers = { 'x-test': '1' };

    await cachedService.get('1.2.3.4', headers);
    expect(mockInsightService.get).toHaveBeenCalledWith('1.2.3.4', headers);
  });
});
