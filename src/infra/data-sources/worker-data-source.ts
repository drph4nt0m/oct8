import { IDataSource } from '#core/interfaces/data-source';
import { logger } from '#infra/logger/logger';
import { R2Bucket } from '#infra/worker-types';

export class WorkerDataSource implements IDataSource {
  constructor(private env: Record<string, unknown>) {}

  async has(key: string): Promise<boolean> {
    if (!key) return false;

    if (this.isR2Bucket(this.env.INSIGHT_DATA)) {
      const obj = await this.env.INSIGHT_DATA.head(key);
      return !!obj;
    }

    // Fallback to binding checks if R2 not present (e.g. assets)
    const bindingName = key.replace(/[.-]/g, '_').toUpperCase();
    return !!this.env[bindingName];
  }

  async load(key: string): Promise<Uint8Array | null> {
    if (!key) return null;

    // 1. Try R2 Bucket
    if (this.isR2Bucket(this.env.INSIGHT_DATA)) {
      try {
        const obj = await this.env.INSIGHT_DATA.get(key);
        if (obj && typeof obj.arrayBuffer === 'function') {
          return new Uint8Array(await obj.arrayBuffer());
        }
      } catch (e: unknown) {
        logger.warn(`[WorkerDataSource] Failed to load ${key} from R2`, e);
      }
    }

    // 2. Fallback to Env Bindings (Assets)
    const bindingName = key.replace(/[.-]/g, '_').toUpperCase();
    const binding = this.env[bindingName];

    if (binding) {
      // If it's an ArrayBuffer (from R2 or KV text->arrayBuffer)
      if (binding instanceof ArrayBuffer) {
        return new Uint8Array(binding);
      }
      // If it's a string, maybe encoded?
      if (typeof binding === 'string') {
        // For now, weak support for string bindings unless base64
        return new TextEncoder().encode(binding);
      }
      // If it's an R2ObjectBody or similar (Cloudflare specific types) check via shape
      if (typeof binding === 'object' && binding !== null && 'arrayBuffer' in binding) {
        const bodyWithBuffer = binding as { arrayBuffer: unknown };
        if (typeof bodyWithBuffer.arrayBuffer === 'function') {
          const buffer = await bodyWithBuffer.arrayBuffer();
          if (buffer instanceof ArrayBuffer) {
            return new Uint8Array(buffer);
          }
        }
      }
    }

    logger.warn(`[WorkerDataSource] No binding found for ${key} (R2 or ${bindingName})`);
    return null;
  }

  private isR2Bucket(obj: unknown): obj is R2Bucket {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'get' in obj &&
      typeof (obj as Record<string, unknown>).get === 'function' &&
      'head' in obj &&
      typeof (obj as Record<string, unknown>).head === 'function'
    );
  }
}
