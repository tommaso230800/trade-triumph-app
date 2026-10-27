// Bound temporary allocations: never create one array entry per byte of a PDF.
const CHUNK_BYTES = 24_576; // Multiple of three keeps intermediate base64 unpadded.

export function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_BYTES))));
  }
  return chunks.join('');
}

export function foldBase64(value: string): string {
  // Each temporary block stays small, even for the largest accepted attachment.
  const chunks: string[] = [];
  const blockSize = 76 * 256;
  for (let offset = 0; offset < value.length; offset += blockSize) {
    const block = value.slice(offset, offset + blockSize);
    const lines: string[] = [];
    for (let line = 0; line < block.length; line += 76) lines.push(block.slice(line, line + 76));
    chunks.push(lines.join('\r\n'));
  }
  return chunks.join('\r\n');
}

export function decodePdfBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}