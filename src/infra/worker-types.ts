/**
 * Shared type definitions for Cloudflare Worker bindings.
 * These interfaces mirror the Cloudflare Workers types to avoid
 * importing the full @cloudflare/workers-types package in pure TS files.
 */

export interface R2Object {
  writeHttpMetadata(headers: Headers): void;
}

export interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
}
