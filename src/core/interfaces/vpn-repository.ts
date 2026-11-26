export interface IVpnRepository {
  isVpnProvider(org: string): Promise<boolean>;
}
