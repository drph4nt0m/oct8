import { z } from '@hono/zod-openapi';

export const LocationSchema = z
  .object({
    country: z.string().optional().openapi({ example: 'United States' }),
    country_code: z.string().optional().openapi({ example: 'US' }),
    city: z.string().optional().openapi({ example: 'Mountain View' }),
    region: z.string().optional().openapi({ example: 'California' }),
    latitude: z.number().optional().openapi({ example: 37.386 }),
    longitude: z.number().optional().openapi({ example: -122.0838 }),
  })
  .openapi('LocationData');

export const InfrastructureSchema = z
  .object({
    asn: z.number().optional().openapi({ example: 15169 }),
    org: z.string().optional().openapi({ example: 'Google LLC' }),
    route: z.string().optional().openapi({ example: '8.8.8.0/24' }),
    reverse_dns: z.string().optional().openapi({ example: 'dns.google' }),
    registry: z.string().optional().openapi({ example: 'arin' }),
    country: z.string().optional().openapi({ example: 'US' }),
    allocated: z.string().optional().openapi({ example: '19921201' }),
    status: z.string().optional().openapi({ example: 'allocated' }),
  })
  .openapi('InfrastructureData');

export const ProviderInfoSchema = z
  .object({
    name: z.string().optional().openapi({ example: 'Amazon Web Services' }),
    slug: z.string().optional().openapi({ example: 'aws' }),
    domain: z.string().optional().openapi({ example: 'aws.amazon.com' }),
    region: z.string().optional().openapi({ example: 'us-east-1' }),
    service: z.string().optional().openapi({ example: 'EC2' }),
  })
  .openapi('ProviderInfo');

export const IdentitySchema = z
  .object({
    type: z
      .enum(['residential', 'business', 'hosting', 'datacenter', 'cellular'])
      .optional()
      .openapi({ example: 'datacenter' }),
    provider: ProviderInfoSchema.optional(),
  })
  .openapi('IdentityData');

export const ThreatSourceSchema = z
  .object({
    slug: z.string().openapi({ example: 'firehol_level1' }),
    name: z.string().openapi({ example: 'FireHOL Level 1' }),
    category: z.string().openapi({ example: 'malware' }),
    url: z.string().optional(),
  })
  .openapi('ThreatSource');

export const SecuritySchema = z
  .object({
    is_anonymous: z.boolean().optional(),
    is_proxy: z.boolean().optional(),
    is_tor: z.boolean().optional(),
    is_vpn: z.boolean().optional(),
    is_threat: z.boolean().optional().openapi({ example: true }),
    sources: z.array(ThreatSourceSchema).optional(),
  })
  .openapi('SecurityData');

export const InsightSchema = z
  .object({
    ip: z.string().openapi({ example: '8.8.8.8' }),
    location: LocationSchema.optional(),
    infrastructure: InfrastructureSchema.optional(),
    identity: IdentitySchema.optional(),
    security: SecuritySchema.optional(),
  })
  .openapi('Insight');

export const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.number().optional(),
  })
  .openapi('ErrorResponse');
