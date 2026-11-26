import { IVpnRepository } from '#core/interfaces/vpn-repository';
import { VPN_PROVIDERS } from '#core/constants/vpn-providers';

// Pre-built Set from the constant list — O(1) per-term check on every request.
const VPN_PROVIDER_SET = new Set(VPN_PROVIDERS);

export class StaticVpnRepository implements IVpnRepository {
  async isVpnProvider(org: string): Promise<boolean> {
    const lowerOrg = org.toLowerCase();
    for (const term of VPN_PROVIDER_SET) {
      if (lowerOrg.includes(term)) return true;
    }
    return false;
  }
}
