/** Default mailbox: every agency profile can send orders from it. */
export const AGENCY_SENDER = 'agenziamazzigroup@gmail.com';

/** Personal mailboxes, keyed by agency username; only that user may send from it. */
export const PERSONAL_SENDERS: Record<string, string> = { tommaso: 'tommasosalti@gmail.com' };

export type MailboxKind = 'agenzia' | 'personale';
export type MailboxOption = { kind: MailboxKind; email: string };

/** Mailboxes the given agency username may choose from, agency first (default). */
export function allowedMailboxes(username: string | null | undefined): MailboxOption[] {
  const personal = username ? PERSONAL_SENDERS[username.trim().toLowerCase()] : undefined;
  return [{ kind: 'agenzia', email: AGENCY_SENDER }, ...(personal ? [{ kind: 'personale' as const, email: personal }] : [])];
}

/** The address an order must leave from, or null when the user may not use that mailbox. */
export function requiredSenderFor(username: string | null | undefined, kind: MailboxKind = 'agenzia'): string | null {
  return allowedMailboxes(username).find(m => m.kind === kind)?.email ?? null;
}
