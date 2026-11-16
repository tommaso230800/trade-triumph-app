/**
 * Link "a un tocco" per contattare un cliente (chiamata, WhatsApp).
 * Solo formattazione: nessun dato viene letto o modificato.
 */

/** Cifre del numero in formato internazionale senza "+" (es. 393331234567). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^[03]/.test(digits) && digits.length >= 6 && digits.length <= 11) digits = `39${digits}`;
  return digits.length >= 8 ? digits : null;
}

export function telHref(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw);
  return n ? `tel:+${n}` : null;
}

/**
 * WhatsApp solo per cellulari italiani (39 3xx…) o numeri esteri:
 * i fissi italiani (39 0…) non hanno WhatsApp nella quasi totalità dei casi.
 */
export function whatsappHref(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw);
  if (!n) return null;
  if (n.startsWith("39") && !n.startsWith("393")) return null;
  return `https://wa.me/${n}`;
}
