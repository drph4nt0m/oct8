import { Context } from 'hono';
import { ConfigService } from '#infra/config/config-service';

export class HealthController {
  constructor(private serviceName: string) {}

  public getHealth(c: Context) {
    let mode: string;
    try {
      const configService = new ConfigService(c.env);
      const config = configService.get();
      mode = config.MODE;
    } catch {
      // Config is invalid — report degraded state without exposing internals.
      mode = 'error-config-invalid';
    }

    return c.json({
      status: 'ok',
      service: this.serviceName,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      env: mode,
    });
  }
}
