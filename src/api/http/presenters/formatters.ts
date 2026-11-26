import { Insight } from '#core/entities/types';
import { htmlTemplate } from '#api/http/templates/html-template';

// Start recursion helper for XML
const toXmlRec = <T extends object>(obj: T, indent = 2): string => {
  let xml = '';
  const spaces = ' '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      let arrayXml = '';
      for (const item of value) {
        if (typeof item === 'object') {
          const nested = toXmlRec(item as object, indent + 4);
          if (nested) {
            arrayXml += `${spaces}  <item>\n${nested}${spaces}  </item>\n`;
          }
        } else {
          arrayXml += `${spaces}  <item>${item}</item>\n`;
        }
      }
      if (arrayXml) {
        xml += `${spaces}<${key}>\n${arrayXml}${spaces}</${key}>\n`;
      }
      continue;
    }

    if (typeof value === 'object') {
      const nested = toXmlRec(value as object, indent + 2);
      if (nested) {
        xml += `${spaces}<${key}>\n${nested}${spaces}</${key}>\n`;
      }
    } else {
      xml += `${spaces}<${key}>${value}</${key}>\n`;
    }
  }
  return xml;
};

export const toXml = (data: Insight): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<response>\n${toXmlRec(data)}</response>`;
};

const toYamlRec = <T extends object>(obj: T, indent = 0): string => {
  let yaml = '';
  const spaces = ' '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;

      let arrayYaml = '';
      for (const item of value) {
        if (typeof item === 'object') {
          const nested = toYamlRec(item as object, indent + 2);
          if (nested) {
            arrayYaml += nested.replace(new RegExp(`^${' '.repeat(indent + 2)}`), `${spaces}- `);
          }
        } else {
          arrayYaml += `${spaces}- ${item}\n`;
        }
      }
      if (arrayYaml) {
        yaml += `${spaces}${key}:\n${arrayYaml}`;
      }
      continue;
    }

    if (typeof value === 'object') {
      const nested = toYamlRec(value as object, indent + 2);
      if (nested) {
        yaml += `${spaces}${key}:\n${nested}`;
      }
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  return yaml;
};

export const toYaml = (data: Insight): string => {
  return toYamlRec(data);
};

export const toText = (data: Insight): string => {
  return toYaml(data);
};

export const toHtml = (data: Insight): string => {
  return htmlTemplate(data);
};

export const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const cleanEmpty = <T>(obj: T): T | undefined => {
  if (obj === null || obj === undefined) return undefined;

  if (Array.isArray(obj)) {
    const cleaned = obj.map((item) => cleanEmpty(item)).filter((item) => item !== undefined);
    return cleaned.length > 0 ? (cleaned as NonNullable<T>) : undefined;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    let hasKeys = false;
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanEmpty(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
        hasKeys = true;
      }
    }
    return hasKeys ? (cleaned as T) : undefined;
  }

  return obj;
};
