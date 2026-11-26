import { BinaryCodec } from '../src/lib/codec';

async function test() {
  console.log('--- Testing BinaryCodec ---');

  // 1. Mock Data
  const input = [
    { prefix: '8.8.8.0/24', data: { service: 'Google DNS', slug: 'google' } },
    { prefix: '1.1.1.0/24', data: { service: 'Cloudflare DNS', slug: 'cloudflare' } },
    { prefix: '8.8.4.4/32', data: { service: 'Google DNS', slug: 'google' } }, // Repetitive metadata
  ];

  console.log('Input Items:', input.length);

  // 2. Prepare Ranges
  const ranges = input.map((i) => {
    const { start, end } = BinaryCodec.cidrToRange(i.prefix);
    return { start, end, data: i.data };
  });

  // 3. Encode
  const startTime = performance.now();
  const buffer = BinaryCodec.encode(ranges);
  const endTime = performance.now();

  console.log(`Encoding Time: ${(endTime - startTime).toFixed(3)}ms`);
  console.log(`Binary Size: ${buffer.length} bytes`);

  // JSON Comparison
  const jsonSize = Buffer.from(JSON.stringify(input)).length;
  console.log(`JSON Size: ~${jsonSize} bytes`);
  console.log(`Compression Ratio: ${((1 - buffer.length / jsonSize) * 100).toFixed(1)}% reduction`);

  // 4. Decode
  const decoded = BinaryCodec.decode(buffer);
  console.log('Decoded Items:', decoded.length);

  // 5. Verify Content
  const first = decoded.find((d) => d.start === '1.1.1.0');
  if (first && first.data.slug === 'cloudflare') {
    console.log('PASS: Correctly decoded Cloudflare range');
  } else {
    console.error('FAIL: Data mismatch', first);
  }

  const second = decoded.find((d) => d.start === '8.8.8.0');
  if (second && second.data.slug === 'google') {
    console.log('PASS: Correctly decoded Google range');
  } else {
    console.error('FAIL: Data mismatch', second);
  }
}

test().catch(console.error);
