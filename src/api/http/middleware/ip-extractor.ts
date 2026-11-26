import { Context } from 'hono';

export class IpExtractor {
  static getClientIp(c: Context): string {
    // Cloudflare specific header
    const cfIp = c.req.header('cf-connecting-ip');
    if (cfIp) {
      return cfIp;
    }

    // Standard Forwarded header (RFC 7239)
    const forwarded = c.req.header('forwarded');
    if (forwarded) {
      const match = forwarded.match(/for="?([^";,]+)"?/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // X-Forwarded-For (De-facto standard)
    const forwardedFor = c.req.header('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // X-Real-IP (Nginx/Common)
    const realIp = c.req.header('x-real-ip');
    if (realIp) {
      return realIp;
    }

    // Fallback (Development/Local)
    return '127.0.0.1';
  }
}
