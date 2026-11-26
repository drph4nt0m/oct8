import { IPUtils } from '#core/utils/ip-utils';
import { logger } from '#infra/logger/logger';

class Node<T> {
  children: Record<string, Node<T>> = {};
  value: T | null = null;
}

export class RadixTree<T> {
  private v4Root = new Node<T>();
  private v6Root = new Node<T>();

  /**
   * Adds a value to the tree at the specified CIDR or IP.
   * @param cidr IPv4 or IPv6 address/CIDR (e.g., "1.2.3.0/24", "2001:db8::/32")
   * @param value The value to store
   */
  add(cidr: string, value: T) {
    let binary: string;
    let prefixLength: number;

    try {
      if (cidr.includes(':')) {
        const parts = cidr.split('/');
        const ipPart = parts[0];
        binary = IPUtils.ipV6ToBinaryString(ipPart);
        prefixLength = parts.length > 1 ? parseInt(parts[1], 10) : 128;
        this.insert(this.v6Root, binary, prefixLength, value);
      } else {
        const parts = cidr.split('/');
        const ipPart = parts[0];
        binary = IPUtils.ipV4ToBinaryString(ipPart);
        prefixLength = parts.length > 1 ? parseInt(parts[1], 10) : 32;
        this.insert(this.v4Root, binary, prefixLength, value);
      }
    } catch {
      // Ignore invalid CIDRs
    }
  }

  addRange(start: string, end: string, value: T) {
    // Helper to split range into CIDRs
    try {
      if (start.includes(':')) {
        // Simple V6 range adding is complex without BigInt stepping, for now we assume distinct CIDRs usually
        // But let's support basic iteration if needed, using IPUtils
        // For simplicity in this refactor, we'll log warning if full range not implemented
        logger.warn('RadixTree addRange optimized for V4 only currently');
        return;
      }

      const startBig = IPUtils.ipToUint32(start);
      const endBig = IPUtils.ipToUint32(end);

      if (startBig === null || endBig === null) return;

      let current = startBig;

      while (current <= endBig) {
        let step = 0;
        // Find max power of 2
        while (
          (current & (1n << BigInt(step))) === 0n &&
          current + (1n << BigInt(step + 1)) - 1n <= endBig
        ) {
          step++;
        }
        // Add CIDR
        const ipStr = IPUtils.uint32ToIp(Number(current));
        const mask = 32 - step;
        this.add(`${ipStr}/${mask}`, value);

        current += 1n << BigInt(step);
      }
    } catch (e: unknown) {
      logger.error('RadixTree addRange error', e);
    }
  }

  private insert(root: Node<T>, binary: string, length: number, value: T) {
    let node = root;
    // Traverse down to the prefix length
    for (let i = 0; i < length; i++) {
      const bit = binary[i];
      if (!node.children[bit]) {
        node.children[bit] = new Node<T>();
      }
      node = node.children[bit];
    }
    // Set the value at this node (the prefix end)
    node.value = value;
  }

  /**
   * Retrieves the value for the longest matching prefix of the given IP.
   * @param ip IPv4 or IPv6 address
   * @returns The value associated with the most specific matching prefix, or null.
   */
  get(ip: string): T | null {
    let binary: string;
    let node: Node<T>;

    try {
      if (ip.includes(':')) {
        binary = IPUtils.ipV6ToBinaryString(ip);
        node = this.v6Root;
      } else {
        binary = IPUtils.ipV4ToBinaryString(ip);
        node = this.v4Root;
      }
    } catch {
      return null;
    }

    let lastMatchedValue: T | null = null;
    let current = node;

    // Check root value (catch-all /0)
    if (current.value !== null) {
      lastMatchedValue = current.value;
    }

    for (const bit of binary) {
      if (current.children[bit]) {
        current = current.children[bit];
        // If this node has a value, it's a more specific match than what we've seen so far
        if (current.value !== null) {
          lastMatchedValue = current.value;
        }
      } else {
        break; // No further match possible
      }
    }

    return lastMatchedValue;
  }
}
