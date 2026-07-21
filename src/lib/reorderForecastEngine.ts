// Reorder Forecast Engine (per prodotto x cliente x azienda)
// Deterministico. Nessuna dipendenza esterna.

export interface RawRigaOrdine {
  ordine_id: string;
  prodotto_id: string;
  quantita_cartoni: number;
  quantita_pezzi: number;
  is_omaggio: boolean;
  prezzo_unitario: number;
  data_ordine: string; // ISO date
  cliente_id: string;
  azienda_id: string;
}

export interface ProductForecast {
  key: string; // cliente|azienda|prodotto
  cliente_id: string;
  azienda_id: string;
  prodotto_id: string;
  numero_ordini: number;
  primo_ordine: string;
  ultimo_ordine: string;
  media_giorni: number;             // intervallo medio giorni fra riordini
  deviazione_giorni: number;        // std dev intervalli
  media_cartoni: number;
  ultima_quantita_cartoni: number;
  ultimo_prezzo: number;
  prossimo_riordino: string | null; // ISO date
  giorni_al_riordino: number | null; // negativo = in ritardo
  urgenza: "critica" | "alta" | "media" | "bassa" | "futura";
  fatturato_medio: number;
  fatturato_totale: number;
}

export interface ForecastKPIs {
  totale_prodotti_monitorati: number;
  in_rottura_oggi: number;         // giorni_al_riordino <= 0
  in_rottura_7gg: number;          // 0 < giorni <= 7
  in_rottura_30gg: number;         // 8 <= giorni <= 30
  clienti_da_contattare: number;   // clienti distinti con almeno 1 prodotto urgenza critica/alta
  fatturato_potenziale_30gg: number;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

function classificaUrgenza(giorni: number | null): ProductForecast["urgenza"] {
  if (giorni === null) return "futura";
  if (giorni <= 0) return "critica";
  if (giorni <= 7) return "alta";
  if (giorni <= 30) return "media";
  if (giorni <= 60) return "bassa";
  return "futura";
}

export function computeReorderForecast(
  righe: RawRigaOrdine[],
  today: Date = new Date()
): ProductForecast[] {
  // Filtra righe non-omaggio con dati validi
  const clean = righe.filter(
    (r) =>
      !r.is_omaggio &&
      r.cliente_id &&
      r.azienda_id &&
      r.prodotto_id &&
      r.data_ordine &&
      (r.quantita_cartoni > 0 || r.quantita_pezzi > 0)
  );

  // Raggruppa per chiave composita
  const groups = new Map<string, RawRigaOrdine[]>();
  for (const r of clean) {
    const k = `${r.cliente_id}|${r.azienda_id}|${r.prodotto_id}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const out: ProductForecast[] = [];
  for (const [key, rows] of groups) {
    // aggrega per giorno (stesso ordine può avere più righe stesso prodotto)
    const perDate = new Map<string, { cartoni: number; prezzo: number; totale: number }>();
    for (const r of rows) {
      const d = r.data_ordine.slice(0, 10);
      const cur = perDate.get(d) || { cartoni: 0, prezzo: 0, totale: 0 };
      const importo = (r.quantita_pezzi || 0) * (r.prezzo_unitario || 0);
      cur.cartoni += r.quantita_cartoni || 0;
      cur.prezzo = r.prezzo_unitario || cur.prezzo;
      cur.totale += importo;
      perDate.set(d, cur);
    }

    const sortedDates = Array.from(perDate.keys()).sort();
    const numero_ordini = sortedDates.length;
    if (numero_ordini === 0) continue;

    const primo_ordine = sortedDates[0];
    const ultimo_ordine = sortedDates[numero_ordini - 1];
    const ultimoData = new Date(ultimo_ordine);
    const ultimaAgg = perDate.get(ultimo_ordine)!;

    // Intervalli in giorni
    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push(daysBetween(new Date(sortedDates[i - 1]), new Date(sortedDates[i])));
    }
    const media_giorni =
      intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 0;
    const deviazione_giorni = stddev(intervals);

    const cartoniTot = sortedDates.reduce((s, d) => s + perDate.get(d)!.cartoni, 0);
    const fatturato_totale = sortedDates.reduce((s, d) => s + perDate.get(d)!.totale, 0);
    const media_cartoni = cartoniTot / numero_ordini;
    const fatturato_medio = fatturato_totale / numero_ordini;

    let prossimo_riordino: string | null = null;
    let giorni_al_riordino: number | null = null;
    if (media_giorni > 0) {
      const prossimoData = addDays(ultimoData, Math.round(media_giorni));
      prossimo_riordino = prossimoData.toISOString().slice(0, 10);
      giorni_al_riordino = daysBetween(today, prossimoData);
    }

    const [cliente_id, azienda_id, prodotto_id] = key.split("|");
    out.push({
      key,
      cliente_id,
      azienda_id,
      prodotto_id,
      numero_ordini,
      primo_ordine,
      ultimo_ordine,
      media_giorni,
      deviazione_giorni,
      media_cartoni,
      ultima_quantita_cartoni: ultimaAgg.cartoni,
      ultimo_prezzo: ultimaAgg.prezzo,
      prossimo_riordino,
      giorni_al_riordino,
      urgenza: classificaUrgenza(giorni_al_riordino),
      fatturato_medio,
      fatturato_totale,
    });
  }

  // Ordina: urgenza critica prima, poi per data prevista
  const ord = { critica: 0, alta: 1, media: 2, bassa: 3, futura: 4 };
  out.sort((a, b) => {
    if (ord[a.urgenza] !== ord[b.urgenza]) return ord[a.urgenza] - ord[b.urgenza];
    return (a.giorni_al_riordino ?? 9999) - (b.giorni_al_riordino ?? 9999);
  });

  return out;
}

export function computeForecastKPIs(forecasts: ProductForecast[]): ForecastKPIs {
  let in_rottura_oggi = 0;
  let in_rottura_7gg = 0;
  let in_rottura_30gg = 0;
  let fatturato_potenziale_30gg = 0;
  const clientiUrgenti = new Set<string>();

  for (const f of forecasts) {
    const g = f.giorni_al_riordino;
    if (g === null) continue;
    if (g <= 0) in_rottura_oggi++;
    else if (g <= 7) in_rottura_7gg++;
    else if (g <= 30) in_rottura_30gg++;

    if (g <= 30) fatturato_potenziale_30gg += f.fatturato_medio;
    if (f.urgenza === "critica" || f.urgenza === "alta") clientiUrgenti.add(f.cliente_id);
  }

  return {
    totale_prodotti_monitorati: forecasts.length,
    in_rottura_oggi,
    in_rottura_7gg,
    in_rottura_30gg,
    clienti_da_contattare: clientiUrgenti.size,
    fatturato_potenziale_30gg,
  };
}
