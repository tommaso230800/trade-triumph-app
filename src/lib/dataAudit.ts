import { supabase } from "@/integrations/supabase/client";
import { integrityReport, isCounted, orderDate, type OrdineLike } from "@/lib/metricsEngine";

/**
 * Controllo dati della pagina Problematiche.
 * Esegue verifiche read-only su ordini e righe e produce segnalazioni con
 * fingerprint stabile: rieseguendo il controllo non si creano duplicati,
 * la stessa incongruenza aggiorna la stessa riga.
 */

export type IssueDraft = {
  fingerprint: string;
  tipo: string;
  gravita: "alta" | "media" | "bassa";
  descrizione: string;
  ordine_id?: string | null;
  ordine_codice?: string | null;
  cliente_nome?: string | null;
  azienda_nome?: string | null;
  periodo?: string | null;
  valore_rilevato?: string | null;
  valore_atteso?: string | null;
  differenza?: string | null;
  causa?: string | null;
  causa_verificata?: boolean;
  link?: string | null;
};

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const PERIODO_FMT = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

function periodoDi(data: string | null): string | null {
  if (!data) return null;
  const d = new Date(`${data.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const label = PERIODO_FMT.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Carica tutti gli ordini con righe, a blocchi da 1000 (limite PostgREST). */
async function fetchAllOrdini(): Promise<any[]> {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("ordini")
      .select(
        "id, codice, status, totale, data_ordine, data_conferma, created_at, cliente_id, azienda_id, clienti(nome), aziende(nome), ordini_righe(quantita_pezzi, quantita_cartoni, prezzo_unitario, sc1, sc2, sc3, is_omaggio, prodotti(pezzi_per_cartone))"
      )
      .order("data_ordine", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export async function runDataAudit(): Promise<IssueDraft[]> {
  const ordini = await fetchAllOrdini();
  const issues: IssueDraft[] = [];
  const oggi = new Date().toISOString().slice(0, 10);
  const byId = new Map(ordini.map((o) => [o.id, o]));

  const base = (o: any) => ({
    ordine_id: o.id as string,
    ordine_codice: (o.codice as string) || null,
    cliente_nome: o.clienti?.nome ?? null,
    azienda_nome: o.aziende?.nome ?? null,
    periodo: periodoDi(orderDate(o)),
    link: "/ordini",
  });

  // 1) Totale ordine vs somma righe nette (stessa logica di Integrity Check).
  const rep = integrityReport(ordini as OrdineLike[]);
  for (const r of rep.rows) {
    const o = byId.get(r.id);
    if (!o) continue;
    if (r.ha_righe && Math.abs(r.delta) > 0.01) {
      issues.push({
        ...base(o),
        fingerprint: `totale_righe:${r.id}`,
        tipo: "Totale ordine diverso dalla somma delle righe",
        gravita: Math.abs(r.delta) > 10 ? "alta" : "media",
        descrizione: `Il totale salvato sull'ordine non coincide con la somma delle righe al netto degli sconti (omaggi esclusi).`,
        valore_rilevato: eur(r.totale),
        valore_atteso: eur(r.somma_righe),
        differenza: eur(r.delta),
        causa:
          "Ipotesi: riga modificata dopo il salvataggio del totale, sconto ordine (%) o sconto merce (€) non riflesso nelle righe, oppure arrotondamento IVA.",
        causa_verificata: false,
      });
    }
    if (!r.ha_righe && r.totale > 0) {
      issues.push({
        ...base(o),
        fingerprint: `senza_righe:${r.id}`,
        tipo: "Ordine con importo ma senza righe prodotto",
        gravita: "media",
        descrizione: `L'ordine ha un totale maggiore di zero ma nessuna riga prodotto collegata.`,
        valore_rilevato: eur(r.totale),
        valore_atteso: "Almeno una riga prodotto",
        differenza: null,
        causa: "Ipotesi: importazione incompleta o righe eliminate dopo la creazione.",
        causa_verificata: false,
      });
    }
  }

  // 2) Collegamenti mancanti e date anomale.
  for (const o of ordini) {
    if (!o.cliente_id || !o.azienda_id) {
      issues.push({
        ...base(o),
        fingerprint: `collegamento:${o.id}`,
        tipo: "Ordine senza cliente o senza azienda",
        gravita: "alta",
        descrizione: `Manca il collegamento a ${!o.cliente_id ? "cliente" : ""}${!o.cliente_id && !o.azienda_id ? " e " : ""}${!o.azienda_id ? "azienda" : ""}: l'ordine sparisce dai filtri Cliente/Azienda e dalle classifiche.`,
        valore_rilevato: `cliente_id: ${o.cliente_id ?? "mancante"} · azienda_id: ${o.azienda_id ?? "mancante"}`,
        valore_atteso: "Entrambi i collegamenti presenti",
        differenza: null,
        causa: "Ipotesi: ordine creato durante importazione senza abbinamento anagrafica.",
        causa_verificata: false,
      });
    }
    const ref = orderDate(o);
    if (!ref) {
      issues.push({
        ...base(o),
        fingerprint: `data_mancante:${o.id}`,
        tipo: "Ordine senza data di riferimento",
        gravita: "media",
        descrizione: "Né data ordine, né data conferma, né data di creazione: impossibile assegnarlo a un periodo.",
        valore_rilevato: "Nessuna data",
        valore_atteso: "Data ordine valorizzata",
        differenza: null,
        causa: "Ipotesi: record creato manualmente o migrazione dati incompleta.",
        causa_verificata: false,
      });
    } else if (ref.slice(0, 10) > oggi && isCounted(o)) {
      issues.push({
        ...base(o),
        fingerprint: `data_futura:${o.id}`,
        tipo: "Data ordine nel futuro",
        gravita: "bassa",
        descrizione: `La data di riferimento (${ref.slice(0, 10)}) è successiva a oggi: l'ordine entra in periodi non ancora trascorsi.`,
        valore_rilevato: ref.slice(0, 10),
        valore_atteso: `Data non oltre il ${oggi}`,
        differenza: null,
        causa: "Ipotesi: errore di inserimento della data o ordine programmato volutamente.",
        causa_verificata: false,
      });
    }
  }

  // 3) Possibili duplicati: stesso codice (non vuoto) e stesso cliente, entrambi contati.
  const byKey = new Map<string, any[]>();
  for (const o of ordini) {
    const cod = (o.codice || "").trim();
    if (!cod || !isCounted(o)) continue;
    const key = `${cod.toLowerCase()}|${o.cliente_id ?? "?"}`;
    byKey.set(key, [...(byKey.get(key) ?? []), o]);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    for (const o of group) {
      issues.push({
        ...base(o),
        fingerprint: `duplicato:${o.id}`,
        tipo: "Possibile ordine duplicato",
        gravita: "media",
        descrizione: `${group.length} ordini contati condividono codice "${o.codice}" e cliente.`,
        valore_rilevato: `${group.length} ordini con lo stesso codice`,
        valore_atteso: "Un solo ordine per codice e cliente",
        differenza: null,
        causa: "Ipotesi: doppia importazione dello stesso documento. Da verificare prima di eliminare.",
        causa_verificata: false,
      });
    }
  }

  return issues;
}

/** Salva le segnalazioni: upsert per fingerprint, niente duplicati. */
export async function saveDataIssues(userId: string, issues: IssueDraft[]): Promise<void> {
  if (issues.length === 0) return;
  const rows = issues.map((i) => ({
    user_id: userId,
    fingerprint: i.fingerprint,
    tipo: i.tipo,
    gravita: i.gravita,
    descrizione: i.descrizione,
    ordine_id: i.ordine_id ?? null,
    ordine_codice: i.ordine_codice ?? null,
    cliente_nome: i.cliente_nome ?? null,
    azienda_nome: i.azienda_nome ?? null,
    periodo: i.periodo ?? null,
    valore_rilevato: i.valore_rilevato ?? null,
    valore_atteso: i.valore_atteso ?? null,
    differenza: i.differenza ?? null,
    causa: i.causa ?? null,
    causa_verificata: i.causa_verificata ?? false,
    link: i.link ?? null,
    controllato_il: new Date().toISOString(),
  }));
  // Batch da 500 per restare sotto i limiti di payload.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from("data_issues")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,fingerprint" });
    if (error) throw error;
  }
}
