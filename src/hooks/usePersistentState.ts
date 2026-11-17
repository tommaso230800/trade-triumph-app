import { useEffect, useState } from "react";

/**
 * Come useState, ma il valore resta memorizzato sul dispositivo tra una visita
 * e l'altra (localStorage). Pensato per i filtri delle liste.
 *
 * `isValid` scarta valori salvati non più ammessi (es. un'opzione rimossa):
 * in quel caso si riparte dal valore iniziale.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid?: (value: unknown) => value is T,
) {
  const storageKey = `filtri:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw == null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (isValid ? isValid(parsed) : typeof parsed === typeof initial) return parsed as T;
    } catch {
      /* valore corrotto o storage non disponibile: si usa l'iniziale */
    }
    return initial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage pieno o in navigazione privata: il filtro resta solo in memoria */
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}

/** Validatore per valori che devono appartenere a un elenco di opzioni. */
export const oneOf =
  <T extends string>(...options: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === "string" && (options as readonly string[]).includes(v);
