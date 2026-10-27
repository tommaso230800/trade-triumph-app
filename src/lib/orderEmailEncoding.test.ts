import { describe, expect, it } from 'vitest';
import { encodeUtf8Base64, foldBase64, decodePdfBase64 } from '../../supabase/functions/send-order-email/encoding';

describe('Order email attachment encoding', () => {
  it('preserves UTF-8 subjects and body', () => {
    const text = 'Ordine D’Amico – 27/10/2026\r\nQuantità: 80 €';
    expect(Buffer.from(encodeUtf8Base64(text), 'base64').toString('utf8')).toBe(text);
  });
  it.each([24_575, 24_576, 24_577, 49_154])('preserves bytes across chunk boundaries (%i)', size => {
    const text = 'a'.repeat(size);
    expect(encodeUtf8Base64(text)).toBe(Buffer.from(text).toString('base64'));
  });
  it('round trips a 12 MB PDF without changing attachment bytes', () => {
    const pdf = Buffer.alloc(12_000_000, 65);
    pdf.write('%PDF-1.7\n');
    const encoded = pdf.toString('base64');
    const folded = foldBase64(encoded);
    expect(folded.replaceAll('\r\n', '')).toBe(encoded);
    const mime = `Content-Transfer-Encoding: base64\r\n\r\n${folded}`;
    expect(Buffer.from(encodeUtf8Base64(mime), 'base64').toString('utf8')).toBe(mime);
    expect(Buffer.compare(Buffer.from(decodePdfBase64(encoded)), pdf)).toBe(0);
  });
  it('folds at 76 characters without a trailing line or extra padding', () => {
    expect(foldBase64('a'.repeat(153))).toBe(`${'a'.repeat(76)}\r\n${'a'.repeat(76)}\r\na`);
    expect(foldBase64('')).toBe('');
  });
});