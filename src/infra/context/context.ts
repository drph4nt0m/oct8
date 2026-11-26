import { AsyncLocalStorage } from 'node:async_hooks';
import { Logger } from '#infra/logger/logger';

export interface RequestContext {
  requestId: string;
  logger?: Logger;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(context: RequestContext, callback: () => T): T => {
  return asyncLocalStorage.run(context, callback);
};

export const getContext = (): RequestContext | undefined => {
  return asyncLocalStorage.getStore();
};
