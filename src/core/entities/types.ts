export interface LocationData {
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface InfrastructureData {
  asn?: number;
  org?: string;
  route?: string; // e.g., 1.2.3.0/24
  reverse_dns?: string;
  registry?: string; // e.g., "arin", "ripe", "apnic"
  country?: string; // e.g., "US" (country of registration)
  allocated?: string; // e.g., "19921201" (date string)
  status?: string; // e.g., "allocated", "assigned"
}

export interface ProviderInfo {
  name?: string; // e.g., "Amazon Web Services"
  slug?: string; // e.g., "aws"
  domain?: string; // e.g., "aws.amazon.com"
  region?: string; // e.g., "us-east-1"
  service?: string; // e.g., "EC2"
}

export interface IdentityData {
  type?: 'residential' | 'business' | 'hosting' | 'datacenter' | 'cellular'; // broad category
  provider?: ProviderInfo;
}

export interface ThreatSource {
  slug: string; // e.g., "firehol_level1"
  name: string; // e.g., "FireHOL Level 1"
  category: string; // e.g., "malware", "botnet"
  url?: string;
}

export interface SecurityData {
  is_anonymous?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_vpn?: boolean;
  is_threat?: boolean;
  sources?: ThreatSource[];
}

export interface Insight {
  ip: string;
  location?: LocationData;
  infrastructure?: InfrastructureData;
  identity?: IdentityData;
  security?: SecurityData;
}

export interface IPRange {
  start: string;
  end: string;
  startNum?: bigint;
  endNum?: bigint;
  data: Record<string, unknown>;
}

import { Result, InsightError } from '#core/result';

export interface InsightProvider {
  name: string;
  init(...args: unknown[]): Promise<void>;
  get(
    ip: string,
    headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>>;
}
