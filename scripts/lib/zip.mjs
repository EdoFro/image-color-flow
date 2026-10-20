// Small ZIP32 writer using Node's built-in deflate. No external packaging tools.
import { deflateRawSync } from 'node:zlib';
const table = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) { let crc = 0xffffffff; for (const value of bytes) crc = table[(crc ^ value) & 255] ^ crc >>> 8; return (crc ^ 0xffffffff) >>> 0; }
export function archiveName(name) {
  if (typeof name !== 'string' || !name || /[\\\x00-\x1f:]/.test(name) || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe archive path: ' + name);
  return name;
}
export function zip(entries) {
  if (!entries.length || entries.length > 65535) throw new Error('ZIP32 entry count exceeded.');
  const chunks = [], directory = [], seen = new Set(); let offset = 0;
  for (const entry of entries) {
    archiveName(entry.name); if (seen.has(entry.name)) throw new Error('Duplicate archive path: ' + entry.name); seen.add(entry.name);
    const name = Buffer.from(entry.name, 'utf8'), data = Buffer.from(entry.data), compressed = deflateRawSync(data, { level: 9 }), crc = crc32(data);
    if (name.length > 65535 || data.length > 0xffffffff || compressed.length > 0xffffffff || offset > 0xffffffff) throw new Error('ZIP32 size exceeded.');
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(33, 12); // 1980-01-01 00:00:00: deterministic metadata.
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, compressed);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0x81a40000, 38); central.writeUInt32LE(offset, 42);
    directory.push(central, name); offset += local.length + name.length + compressed.length;
  }
  const size = directory.reduce((sum, data) => sum + data.length, 0);
  if (offset + size + 22 > 0xffffffff) throw new Error('ZIP32 total size exceeded.');
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...directory, end]);
}
