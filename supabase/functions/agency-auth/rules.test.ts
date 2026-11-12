import { assertEquals } from 'jsr:@std/assert@1';
import { internalIdentity, lockMinutesLeft, normalizeUsername, validPassword } from './rules.ts';

Deno.test('username is case-insensitive', () => {
  assertEquals(normalizeUsername(' Gabriele '), normalizeUsername('gabriele'));
});
Deno.test('internal identity is stable for any case', () => {
  assertEquals(internalIdentity('Andrea'), internalIdentity('ANDREA'));
});
Deno.test('locks after 5 failures within 15 minutes', () => {
  const now = Date.now();
  const fails = Array.from({ length: 5 }, (_, i) => ({ created_at: new Date(now - i * 60_000).toISOString() }));
  assertEquals(lockMinutesLeft(fails.slice(0, 4), 5, now), 0);
  assertEquals(lockMinutesLeft(fails, 5, now) > 0, true);
});
Deno.test('initial password length accepted', () => {
  assertEquals(validPassword('Mazzisalti26'), null);
});
