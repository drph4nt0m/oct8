import { AssertionError } from './errors';

export class InsightError extends Error {
  constructor(
    public code: string,
    message: string,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InsightError';
  }
}

export class Result<T, E = Error> {
  private constructor(
    private _ok: boolean,
    private _value?: T,
    private _error?: E,
  ) {}

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  static err<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  isOk(): this is Result<T, never> & { value: T } {
    return this._ok;
  }

  isErr(): this is Result<never, E> & { error: E } {
    return !this._ok;
  }

  get value(): T {
    if (!this._ok) throw new AssertionError('Cannot get value of Err Result');
    return this._value as T;
  }

  get error(): E {
    if (this._ok) throw new AssertionError('Cannot get error of Ok Result');
    return this._error as E;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isOk()) {
      return Result.ok(fn(this.value));
    }
    return Result.err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    if (this.isErr()) {
      return Result.err(fn(this.error));
    }
    return Result.ok(this.value);
  }
}
