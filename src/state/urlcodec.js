import LZString from 'lz-string';

// Decode a legacy base64url(JSON) payload — the share-link format used before
// compression. Kept so old links people already shared still open.
function b64urlDecode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

// Pack an object into a compact, URL-safe string. v1 = LZ-string, marked with a
// leading 'z'. LZ's URI alphabet contains '+', which URLSearchParams reads as a
// space, so we swap '+' -> '_' (a char LZ never emits) and back on unpack.
export function pack(obj) {
  return 'z' + LZString.compressToEncodedURIComponent(JSON.stringify(obj)).replace(/\+/g, '_');
}

// Unpack a packed string. 'z' prefix = compressed (v1); anything else is treated
// as a legacy base64url(JSON) payload.
export function unpack(str) {
  if (str[0] === 'z') return JSON.parse(LZString.decompressFromEncodedURIComponent(str.slice(1).replace(/_/g, '+')));
  return b64urlDecode(str);
}
