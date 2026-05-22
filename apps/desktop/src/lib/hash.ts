// 64-bit FNV-1a hash, rendered as 16-char hex.
// Used to derive stable Track ids from (path + size + mtime).

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

export function fnv1a64(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i) & 0xff);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, "0");
}

export function trackIdFromMeta(path: string, sizeBytes: number, mtimeSecs: number): string {
  return fnv1a64(`${path}|${sizeBytes}|${mtimeSecs}`);
}
