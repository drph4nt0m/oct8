import { describe, it, expect } from 'vitest';
import { RadixTree } from '#core/entities/radix-tree';

describe('RadixTree', () => {
  it('should store and retrieve IPv4 value', () => {
    const tree = new RadixTree<string>();
    tree.add('192.168.1.1/32', 'value1');
    expect(tree.get('192.168.1.1')).toBe('value1');
  });

  it('should handle CIDR ranges correctly', () => {
    const tree = new RadixTree<string>();
    tree.add('10.0.0.0/24', 'subnet');
    expect(tree.get('10.0.0.1')).toBe('subnet');
    expect(tree.get('10.0.0.255')).toBe('subnet');
    expect(tree.get('10.0.1.1')).toBeNull();
  });

  it('should return most specific match', () => {
    const tree = new RadixTree<string>();
    tree.add('10.0.0.0/8', 'general');
    tree.add('10.1.0.0/16', 'specific');

    expect(tree.get('10.1.2.3')).toBe('specific');
    expect(tree.get('10.2.2.3')).toBe('general');
  });

  it('should handle IPv6 addresses', () => {
    const tree = new RadixTree<string>();
    tree.add('2001:db8::/32', 'ipv6-subnet');
    expect(tree.get('2001:db8::1')).toBe('ipv6-subnet');
  });
});
