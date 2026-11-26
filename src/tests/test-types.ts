import { Config } from '#infra/config/schema';
import { Context } from 'hono';
import { InsightProvider } from '#core/entities/types';
import { Logger } from '#infra/logger/logger';
import { IDataSource } from '#core/interfaces/data-source';
import { IVpnRepository } from '#core/interfaces/vpn-repository';
import { BinaryAdapter } from '#infra/adapters/intelligence-adapter';

export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T | undefined;

// Mock Types
export type MockConfig = DeepPartial<Config>;
export type MockLogger = DeepPartial<Logger>;
export type MockBinaryAdapter = DeepPartial<BinaryAdapter>;
export type MockContext = DeepPartial<Context>;
export type MockInsightProvider = DeepPartial<InsightProvider> & { name: string };
export type MockDataSource = DeepPartial<IDataSource>;
export type MockVpnRepo = DeepPartial<IVpnRepository>;
