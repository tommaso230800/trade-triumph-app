// Pure rules shared by the agency login function and its tests.
export const MAX_USER_FAILURES = 5;
export const MAX_IP_FAILURES = 20;
export const LOCK_WINDOW_MINUTES = 15;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

/** Internal sign-in identity for members without a personal email. Not a mailbox. */
export const internalIdentity = (username: string) =>
  `${normalizeUsername(username).replace(/[^a-z0-9._-]/g, '')}@utenti.agenziamazzi.invalid`;

export const isEmailLike = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

/** Minutes left before a new attempt is allowed, 0 when not locked. */
export function lockMinutesLeft(failures: { created_at: string }[], limit: number, now = Date.now()): number {
  if (failures.length < limit) return 0;
  const sorted = failures.map((f) => new Date(f.created_at).getTime()).sort((a, b) => b - a);
  const oldestRelevant = sorted[limit - 1];
  const unlockAt = oldestRelevant + LOCK_WINDOW_MINUTES * 60_000;
  return Math.max(0, Math.ceil((unlockAt - now) / 60_000));
}

export function validPassword(password: string): string | null {
  if (password.length < 8) return 'La password deve avere almeno 8 caratteri.';
  if (password.length > 72) return 'La password può avere al massimo 72 caratteri.';
  return null;
}
