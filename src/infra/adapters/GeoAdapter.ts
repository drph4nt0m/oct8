import { LocationData } from '#core/entities/types';

export interface IGeoAdapter {
  lookup(ip: string, headers?: Record<string, string | undefined>): Promise<LocationData | null>;
}

// 1. Header Adapter (Edge)
export class HeaderAdapter implements IGeoAdapter {
  async lookup(
    ip: string,
    headers?: Record<string, string | undefined>,
  ): Promise<LocationData | null> {
    if (!headers) return null;

    // Security check: Only use headers if the requested IP matches the client IP
    // Otherwise we would return the client's location for a lookup of 8.8.8.8
    const cfConnectingIp = headers['cf-connecting-ip'];
    if (!cfConnectingIp || cfConnectingIp !== ip) {
      return null;
    }

    // Cloudflare Headers
    const country = headers['cf-ipcountry'];

    if (country) {
      return {
        country_code: country,
      };
    }

    return null;
  }
}
