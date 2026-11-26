import { getContext } from '#infra/context/context';

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class JsonLogger implements Logger {
  private bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    const context = getContext();
    const contextBindings = context ? { requestId: context.requestId } : {};

    const data = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.bindings,
      ...contextBindings,
    } as Record<string, unknown>;

    if (args.length > 0) {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        Object.assign(data, args[0]);
      } else {
        data.args = args;
      }
    }

    // JSON.stringify can throw on circular references, ensuring safe logging
    try {
      console.log(JSON.stringify(data));
    } catch (err: unknown) {
      console.log(
        JSON.stringify({
          level: 'error',
          message: 'Failed to serialize log message',
          originalMessage: message,
          error: String(err),
        }),
      );
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, args);
  }
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new JsonLogger({ ...this.bindings, ...bindings });
  }
}

export class ConsoleLogger implements Logger {
  private bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  private formatBindings(): string {
    const keys = Object.keys(this.bindings);
    if (keys.length === 0) return '';
    return `(${keys.map((k) => `${k}=${this.bindings[k]}`).join(' ')})`;
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${this.formatBindings()} ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${this.formatBindings()} ${message}`, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${this.formatBindings()} ${message}`, ...args);
  }
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${this.formatBindings()} ${message}`, ...args);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

// JsonLogger is the default — emits structured JSON captured by Cloudflare Observability.
export const logger = new JsonLogger();
