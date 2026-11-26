/**
 * NODE.JS ONLY — Do NOT import this file in Cloudflare Worker code.
 *
 * This module calls `process.exit(1)` at import time if env validation fails,
 * which does not exist on the Edge runtime. Worker code must use `ConfigService`
 * (which validates per-request via `c.env`) instead of this module.
 *
 * Safe to use in: scripts, tests (Node.js/Vitest), local dev server.
 */
import dotenv from 'dotenv';
import { ConfigSchema } from './schema';
import { logger } from '#infra/logger/logger';

dotenv.config();

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

export const config = parsed.data;
export type { Config } from './schema';
