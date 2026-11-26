import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATA_DIR: z.string().default('data'),
  INSIGHT_BINARY_FILE: z.string().default('insight.bin'),
  MAXMIND_CITY_FILE: z.string().default('GeoLite2-City.mmdb'),
  MAXMIND_ASN_FILE: z.string().default('GeoLite2-ASN.mmdb'),
  MODE: z.enum(['auto', 'binary', 'legacy']).default('auto'),
});

export type Config = z.infer<typeof ConfigSchema>;
