import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityProvider } from '#infra/providers/identity';

function toBuffer(data: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data));
}

// Minimal valid cloud provider data format
const awsEntry = {
  aws: {
    name: 'Amazon Web Services',
    domain: 'aws.amazon.com',
    prefixes: [
      { prefix: '52.0.0.0/8', region: 'us-east-1', service: 'EC2' },
      { prefix: '54.0.0.0/8', region: 'eu-west-1', service: 'S3' },
    ],
  },
  gcp: {
    name: 'Google Cloud',
    domain: 'cloud.google.com',
    prefixes: [{ prefix: '34.0.0.0/8' }],
  },
};

describe('IdentityProvider', () => {
  let provider: IdentityProvider;

  beforeEach(() => {
    provider = new IdentityProvider();
  });

  // --- init() ---

  it('warns and returns early when no buffer is provided', async () => {
    await provider.init(undefined);
    const result = await provider.get('52.1.2.3');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('loads prefixes from a valid buffer and logs the count', async () => {
    const logSpy = vi.spyOn(console, 'log');
    await provider.init(toBuffer(awsEntry));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3')); // 2 aws + 1 gcp
    logSpy.mockRestore();
  });

  it('skips malformed entries missing "prefixes" key (validates F3c runtime guard)', async () => {
    const badData = {
      good: { name: 'GoodProvider', prefixes: [{ prefix: '1.0.0.0/8' }] },
      bad: { name: 'BadProvider' }, // missing prefixes — should be skipped
    };
    await expect(provider.init(toBuffer(badData))).resolves.not.toThrow();
    // The good entry should still be loaded
    const result = await provider.get('1.1.1.1');
    expect(result.isOk()).toBe(true);
  });

  it('handles malformed JSON without throwing', async () => {
    await expect(provider.init(new TextEncoder().encode('{ broken json'))).resolves.not.toThrow();
  });

  // --- get() ---

  it('returns NOT_FOUND for an IP outside any known prefix', async () => {
    await provider.init(toBuffer(awsEntry));
    const result = await provider.get('8.8.8.8');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns correct identity data for an IP in a known cloud prefix', async () => {
    await provider.init(toBuffer(awsEntry));
    const result = await provider.get('52.1.2.3');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.identity?.type).toBe('datacenter');
      expect(result.value.identity?.provider?.slug).toBe('aws');
      expect(result.value.identity?.provider?.name).toBe('Amazon Web Services');
      expect(result.value.identity?.provider?.domain).toBe('aws.amazon.com');
      expect(result.value.identity?.provider?.service).toBe('EC2');
      expect(result.value.identity?.provider?.region).toBe('us-east-1');
    }
  });

  it('resolves a second provider (GCP) correctly', async () => {
    await provider.init(toBuffer(awsEntry));
    const result = await provider.get('34.1.0.0');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.identity?.provider?.slug).toBe('gcp');
    }
  });

  it('returns the correct ip field in the result', async () => {
    await provider.init(toBuffer(awsEntry));
    const result = await provider.get('52.1.2.3');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.ip).toBe('52.1.2.3');
  });
});
