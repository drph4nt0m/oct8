export const RATE_LIMITS = {
  /** Default limit applied to all API routes */
  default: { max: 100, windowMs: 60_000 },
  /** Lite field endpoints — same for now, easy to diverge later */
  lite: { max: 100, windowMs: 60_000 },
} as const;

export type RateLimitProfile = keyof typeof RATE_LIMITS;
