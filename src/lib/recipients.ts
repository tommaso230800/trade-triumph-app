/** Recipient helpers for the order email composer (A / CC chips + suggestions). */

export interface EmailContact {
  id: string;
  azienda_id: string;
  nome: string;
  email: string;
  ruolo: string | null;
  default_to: boolean;
  default_cc: boolean;
}

export const normalizeEmail = (v: string) => v.trim().toLowerCase();
export const isValidEmail = (v: string) => /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(v.trim());

/** Adds an address to a list unless it is already present in A or CC. */
export function addRecipient(list: string[], other: string[], email: string): { list: string[]; duplicate: "same" | "other" | null } {
  const e = normalizeEmail(email);
  if (list.some((x) => normalizeEmail(x) === e)) return { list, duplicate: "same" };
  if (other.some((x) => normalizeEmail(x) === e)) return { list, duplicate: "other" };
  return { list: [...list, e], duplicate: null };
}

/** Default A / CC from the company address book; never the same address in both. */
export function defaultRecipients(contacts: EmailContact[], aziendaId: string) {
  const own = contacts.filter((c) => c.azienda_id === aziendaId);
  const to = [...new Set(own.filter((c) => c.default_to).map((c) => normalizeEmail(c.email)))];
  const cc = [...new Set(own.filter((c) => c.default_cc).map((c) => normalizeEmail(c.email)))].filter((e) => !to.includes(e));
  return { to, cc };
}

/**
 * Suggestions from the first typed letter. Contacts of the order company come
 * first; addresses already chosen in A or CC are left out.
 */
export function suggestRecipients(contacts: EmailContact[], term: string, aziendaId: string | null, exclude: string[], limit = 8): EmailContact[] {
  const t = term.trim().toLocaleLowerCase("it");
  if (!t) return [];
  const taken = new Set(exclude.map(normalizeEmail));
  const seen = new Set<string>();
  const scored: { c: EmailContact; score: number }[] = [];
  for (const c of contacts) {
    const e = normalizeEmail(c.email);
    if (taken.has(e)) continue;
    const name = c.nome.toLocaleLowerCase("it");
    const role = (c.ruolo ?? "").toLocaleLowerCase("it");
    const hit = name.includes(t) || e.includes(t) || role.includes(t);
    if (!hit) continue;
    const prefix = name.startsWith(t) || e.startsWith(t) ? 0 : 1;
    const own = c.azienda_id === aziendaId ? 0 : 2;
    scored.push({ c, score: own + prefix });
  }
  scored.sort((a, b) => a.score - b.score || a.c.nome.localeCompare(b.c.nome, "it"));
  const out: EmailContact[] = [];
  for (const { c } of scored) {
    const key = `${c.azienda_id === aziendaId ? "own" : "other"}:${normalizeEmail(c.email)}`;
    if (seen.has(normalizeEmail(c.email)) || seen.has(key)) continue;
    seen.add(normalizeEmail(c.email));
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}
