import { InsightProvider, Insight } from '#core/entities/types';
import { Result, InsightError } from '#core/result';
import { Logger } from '#infra/logger/logger';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  timeoutMs: number;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export class CircuitBreakerProvider implements InsightProvider {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly inner: InsightProvider,
    private readonly logger: Logger,
    options?: Partial<CircuitBreakerOptions>,
  ) {
    this.options = {
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      timeoutMs: 2000,
      ...options,
    };
  }

  get name(): string {
    return `CircuitBreaker(${this.inner.name})`;
  }

  async init(...args: unknown[]): Promise<void> {
    // We initiate the inner provider, but we wrap it to ensure it doesn't hang indefinitely
    // Note: init might be slow, we might want to timeout this too,
    // but usually we care more about runtime 'get' calls.
    // For now, let's just delegate.
    return this.inner.init(...args);
  }

  async get(
    ip: string,
    headers?: Record<string, string | undefined>,
  ): Promise<Result<Insight, InsightError>> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.logger.warn(`[CircuitBreaker] ${this.inner.name} is OPEN. Skipping.`);
        return Result.err(new InsightError('CIRCUIT_OPEN', `Circuit ${this.inner.name} is OPEN`));
      }
    }

    try {
      const result = await this.executeWithTimeout(
        this.inner.get(ip, headers),
        this.options.timeoutMs,
      );

      if (result.isErr()) {
        // NOT_FOUND is an expected domain result (IP simply not in this provider's DB).
        // Only count infrastructure-level failures against the circuit threshold.
        if (result.error.code !== 'NOT_FOUND') {
          this.onFailure(result.error);
        }
        return result;
      }

      this.onSuccess();
      return result;
    } catch (err: unknown) {
      this.onFailure(err);
      return Result.err(
        new InsightError('PROVIDER_ERROR', err instanceof Error ? err.message : String(err)),
      );
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T> | T, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
    }
    this.failures = 0;
  }

  private onFailure(err: unknown) {
    this.failures++;
    this.lastFailureTime = Date.now();
    const errorMsg = err instanceof Error ? err.message : String(err);

    this.logger.error(
      `[CircuitBreaker] Error in ${this.inner.name}: ${errorMsg}. Failures: ${this.failures}/${this.options.failureThreshold}`,
    );

    if (this.state === CircuitState.HALF_OPEN || this.failures >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState) {
    this.state = newState;
    const stateName = CircuitState[newState];
    this.logger.warn(`[CircuitBreaker] ${this.inner.name} transitioned to ${stateName}`);
  }
}
