import { describe, it, expect } from 'vitest';
import { graphLink, itemKey, nextCheckpoint, validName } from './protocol';
describe('OneDrive whole-drive protocol', () => {
  it('follows root pagination and preserves its token', () => expect(graphLink('https://graph.microsoft.com/v1.0/me/drive/root/delta?$skiptoken=abc')).toBe('/me/drive/root/delta?$skiptoken=abc'));
  it('does not declare a partial scan complete', () => expect(nextCheckpoint({'@odata.nextLink':'next'})).toEqual({next:'next',delta:null,complete:false}));
  it('requires final delta before completion', () => { expect(nextCheckpoint({'@odata.deltaLink':'delta'}).complete).toBe(true); expect(()=>nextCheckpoint({})).toThrow(); });
  it('identifies moves by stable drive/item IDs rather than names', () => expect(itemKey('u','d','i')).toBe('u:d:i'));
  it('keeps different items with identical content distinct', () => expect(itemKey('u','d','i1')).not.toBe(itemKey('u','d','i2')));
  it('rejects unsafe physical folder names', () => { expect(validName('../x')).toBe(false); expect(validName('POLARA')).toBe(true); });
  it('rejects foreign continuation hosts', () => expect(()=>graphLink('https://evil.example/v1.0/me/drive/root/delta')).toThrow());
});
