import { Context, Next } from 'hono';
import { StatusCode } from 'hono/utils/http-status';
import { IpExtractor } from '#api/http/middleware/ip-extractor';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: StatusCode;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  statusCode: 429,
};

const hits = new Map<string, number>();
const resetTime = new Map<string, number>();

const cleanup = () => {
  const now = Date.now();
  hits.forEach((_, key) => {
    if ((resetTime.get(key) || 0) < now) {
      hits.delete(key);
      resetTime.delete(key);
    }
  });
};

export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async (c: Context, next: Next) => {
    // Lazy cleanup (1% chance to prevent memory leaks)
    if (Math.random() < 0.01) {
      cleanup();
    }

    // Note: This Map is Isolate-scoped in Cloudflare Workers!
    // For distributed rate limits across the edge, use Cloudflare Rate Limiting Rules.
    const ip = IpExtractor.getClientIp(c);

    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, 1);
      resetTime.set(ip, now + finalConfig.windowMs);
    } else {
      if (now > (resetTime.get(ip) || 0)) {
        // Reset window passed
        hits.set(ip, 1);
        resetTime.set(ip, now + finalConfig.windowMs);
      } else {
        // Increment
        hits.set(ip, (hits.get(ip) || 0) + 1);
      }
    }

    if ((hits.get(ip) || 0) > finalConfig.max) {
      c.status(finalConfig.statusCode as StatusCode);
      return c.text(finalConfig.message || 'Too many requests');
    }

    await next();
  };
};
