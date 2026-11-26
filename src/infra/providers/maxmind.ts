import { Buffer } from 'node:buffer';
import { CityResponse, AsnResponse, Reader } from 'maxmind';
import { InsightProvider, Insight, LocationData, InfrastructureData } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { Logger } from '#infra/logger/logger';

// Define paths to MMDB files

export class MaxMindProvider implements InsightProvider {
  name = 'MaxMind';
  private cityReader: Reader<CityResponse> | null = null;
  private asnReader: Reader<AsnResponse> | null = null;

  constructor(private logger?: Logger) {}

  async init(cityBuffer?: Uint8Array, asnBuffer?: Uint8Array) {
    try {
      if (cityBuffer) {
        this.cityReader = new Reader<CityResponse>(Buffer.from(cityBuffer));
        this.logger?.info('MaxMind City DB loaded.');
      } else {
        this.logger?.warn('MaxMind City DB data not provided');
      }

      if (asnBuffer) {
        this.asnReader = new Reader<AsnResponse>(Buffer.from(asnBuffer));
        this.logger?.info('MaxMind ASN DB loaded.');
      } else {
        this.logger?.warn('MaxMind ASN DB data not provided');
      }
    } catch (error: unknown) {
      this.logger?.error('Error loading MaxMind DB files:', error);
    }
  }

  async get(
    ip: string,
    _headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    const location: LocationData = {};
    const infrastructure: InfrastructureData = {};
    let hasData = false;

    try {
      const cityResult = this.cityReader?.get(ip);
      const asnResult = this.asnReader?.get(ip);

      if (cityResult) {
        location.country =
          cityResult.country?.names?.en || cityResult.registered_country?.names?.en;
        location.country_code = cityResult.country?.iso_code;
        location.city = cityResult.city?.names?.en;
        location.region = cityResult.subdivisions?.[0]?.names?.en;
        location.latitude = cityResult.location?.latitude;
        location.longitude = cityResult.location?.longitude;
        hasData = true;
      }

      if (asnResult) {
        infrastructure.asn = asnResult.autonomous_system_number;
        infrastructure.org = asnResult.autonomous_system_organization;
        hasData = true;
      }
    } catch (err: unknown) {
      return Result.err(
        new InsightError('PROVIDER_ERROR', err instanceof Error ? err.message : String(err)),
      );
    }

    if (!hasData) {
      return Result.err(new InsightError('NOT_FOUND', 'IP not found in MaxMind DB'));
    }

    return Result.ok({
      ip,
      location: Object.keys(location).length > 0 ? location : undefined,
      infrastructure: Object.keys(infrastructure).length > 0 ? infrastructure : undefined,
    });
  }
}
