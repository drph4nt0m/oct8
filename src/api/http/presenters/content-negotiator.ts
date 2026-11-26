import { Context } from 'hono';
import { Insight } from '#core/entities/types';
import { toXml, toText, toHtml, toYaml, cleanEmpty } from '#api/http/presenters/formatters';

export class ContentNegotiator {
  static formatResponse(c: Context, rawData: Insight, options: { cacheControl?: string } = {}) {
    const formatQuery = c.req.query('format');
    const acceptHeader = c.req.header('Accept') || '';

    // Prune all empty objects and arrays globally across all formats
    const data: Insight = cleanEmpty(rawData) ?? { ip: rawData.ip };

    // Cache Control (Default: Public, 1 hour)
    const cacheControl = options.cacheControl ?? 'public, max-age=3600';
    c.header('Cache-Control', cacheControl);
    c.header('Vary', 'Accept');

    // 1. Explicit Query overrides everything else
    if (formatQuery) {
      switch (formatQuery) {
        case 'html':
          c.header('Content-Type', 'text/html');
          return c.html(toHtml(data));
        case 'xml':
          c.header('Content-Type', 'application/xml');
          return c.body(toXml(data));
        case 'text':
          c.header('Content-Type', 'text/plain');
          return c.text(toText(data));
        case 'yaml':
          c.header('Content-Type', 'application/yaml');
          return c.body(toYaml(data));
        case 'json':
          c.header('Content-Type', 'application/json');
          return c.json(data);
        default:
          return c.json({ error: 'Unsupported format' }, 400);
      }
    }

    // 2. Fallback to Accept Header
    if (acceptHeader.includes('text/html')) {
      c.header('Content-Type', 'text/html');
      return c.html(toHtml(data));
    }

    if (acceptHeader.includes('application/xml')) {
      c.header('Content-Type', 'application/xml');
      return c.body(toXml(data));
    }

    if (acceptHeader.includes('text/plain')) {
      c.header('Content-Type', 'text/plain');
      return c.text(toText(data));
    }

    // 3. JSON (Default)
    return c.json(data);
  }
}
