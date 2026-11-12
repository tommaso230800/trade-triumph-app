import { useId, useMemo, useRef, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addRecipient, isValidEmail, normalizeEmail, suggestRecipients, type EmailContact } from "@/lib/recipients";

interface Props {
  label: string;
  value: string[];
  other: string[];
  otherLabel: string;
  onChange: (next: string[]) => void;
  contacts: EmailContact[];
  aziendaId: string | null;
  aziendaNames: Map<string, string>;
  disabled?: boolean;
  /** Explicitly save a manually typed address in the company address book. */
  onSaveToBook?: (email: string) => void;
}

/** Recipient field: chips removable one by one, suggestions from the first letter. */
export function RecipientInput({ label, value, other, otherLabel, onChange, contacts, aziendaId, aziendaNames, disabled, onSaveToBook }: Props) {
  const id = useId();
  const [term, setTerm] = useState("");
  const [focus, setFocus] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => suggestRecipients(contacts, term, aziendaId, [...value, ...other]), [contacts, term, aziendaId, value, other]);
  const known = useMemo(() => new Set(contacts.filter((c) => c.azienda_id === aziendaId).map((c) => normalizeEmail(c.email))), [contacts, aziendaId]);

  const add = (email: string) => {
    const r = addRecipient(value, other, email);
    if (r.duplicate === "same") setNotice("Indirizzo già presente in questo campo.");
    else if (r.duplicate === "other") setNotice(`Indirizzo già presente in ${otherLabel}.`);
    else { onChange(r.list); setNotice(null); }
    setTerm("");
    setActive(0);
    inputRef.current?.focus();
  };

  const commitTyped = () => {
    const t = term.trim().replace(/[,;]+$/, "");
    if (!t) return;
    if (!isValidEmail(t)) { setNotice("Indirizzo non completo: scegli un suggerimento o scrivi un’email valida."); return; }
    add(t);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp" && suggestions.length) { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
      if (!term.trim()) return;
      if (suggestions[active] && !isValidEmail(term)) { e.preventDefault(); add(suggestions[active].email); return; }
      if (e.key !== "Tab" || isValidEmail(term)) { e.preventDefault(); commitTyped(); }
    } else if (e.key === "Backspace" && !term && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className={`flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-1.5 ${focus ? "border-primary ring-2 ring-primary/20" : "border-border"} ${disabled ? "opacity-60" : ""}`} onClick={() => inputRef.current?.focus()}>
        {value.map((email) => {
          const contact = contacts.find((c) => normalizeEmail(c.email) === email && c.azienda_id === aziendaId) ?? contacts.find((c) => normalizeEmail(c.email) === email);
          const foreign = contact && contact.azienda_id !== aziendaId && !known.has(email);
          return (
            <span key={email} className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-sm ${foreign ? "border-warning/40 bg-warning/10" : "border-border bg-background"}`}>
              <span className="min-w-0 truncate">{contact ? `${contact.nome} · ${email}` : email}</span>
              {!disabled && !known.has(email) && !contact && onSaveToBook && (
                <button type="button" aria-label={`Salva ${email} nella rubrica`} title="Salva nella rubrica dell’azienda" className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); onSaveToBook(email); }}>
                  <BookmarkPlus className="h-4 w-4" />
                </button>
              )}
              {!disabled && (
                <button type="button" aria-label={`Rimuovi ${email}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== email)); }}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </span>
          );
        })}
        <input
          ref={inputRef}
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          value={term}
          placeholder={value.length ? "" : "Scrivi nome o email"}
          onChange={(e) => { setTerm(e.target.value); setActive(0); setNotice(null); }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => { setFocus(false); }, 150)}
          className="h-9 min-w-[8rem] flex-1 bg-transparent px-1 text-base outline-none sm:text-sm"
          role="combobox"
          aria-expanded={focus && suggestions.length > 0}
          aria-controls={`${id}-list`}
        />
      </div>
      {focus && term.trim() && (suggestions.length > 0 || isValidEmail(term)) && (
        <ul id={`${id}-list`} role="listbox" className="max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(s.email)} className={`flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-left ${i === active ? "bg-muted" : "hover:bg-muted"}`}>
                <span className="text-sm font-medium">{s.nome}{s.ruolo ? ` · ${s.ruolo}` : ""}</span>
                <span className="break-all text-xs text-muted-foreground">{s.email}{s.azienda_id !== aziendaId ? ` · ${aziendaNames.get(s.azienda_id) ?? "altra azienda"}` : ""}</span>
              </button>
            </li>
          ))}
          {isValidEmail(term) && !suggestions.some((s) => normalizeEmail(s.email) === normalizeEmail(term)) && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commitTyped} className="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                Aggiungi «{term.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}
      {notice && <p className="text-xs text-warning" role="status">{notice}</p>}
    </div>
  );
}

export function SaveToBookButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={disabled}>Salva in rubrica</Button>;
}
