import { describe, expect, it } from 'vitest';
import { reorderExclusion } from './reorderEligibility';
import { analyzePair } from './reorderIntelligence';
import { computeReorderPairs } from './reorderPairs';
import { computeReorderForecast } from './reorderForecastEngine';

describe('Riordino esclusivamente dal 1° gennaio 2026', () => {
  const source = ['2024-12-31', '2025-12-31', '2026-01-01', '2026-02-01', '2027-01-01'].map((date, i) => ({
    id: `o${i}`, data_ordine: date, cliente_id: 'c', azienda_id: 'a',
    status: 'completato', totale: 100, cartoni: 1, pezzi: 1,
  }));
  const today = '2027-02-01';

  it('esclude il 2025 e gli anni precedenti anche se documentati', () => {
    expect(reorderExclusion(source[0], today)).not.toBeNull();
    expect(reorderExclusion(source[1], today)).not.toBeNull();
  });

  it('include il 1° gennaio 2026 e conserva gli anni successivi', () => {
    expect(reorderExclusion(source[2], today)).toBeNull();
    expect(reorderExclusion(source[4], today)).toBeNull();
  });

  it('coppie e grafici usano solo i tre ordini dal 2026 senza modificare la fonte', () => {
    const snapshot = JSON.stringify(source);
    const pairs = computeReorderPairs(source, today);
    expect(pairs[0].ordine_ids).toEqual(['o2', 'o3', 'o4']);
    const detail = analyzePair('c', 'a', source, [], { today });
    expect(detail.numero_ordini).toBe(3);
    expect(detail.primo_ordine).toBe('2026-01-01');
    expect(detail.intervalli.map(x => x.giorni)).toEqual([31, 334]);
    expect(detail.volumi.map(x => x.data)).toEqual(['2026-01-01', '2026-02-01', '2027-01-01']);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('prodotti escludono anche quantità e valori precedenti al 2026', () => {
    const rows = source.map(o => ({ ordine_id: o.id, prodotto_id: 'p',
      quantita_cartoni: 1, quantita_pezzi: 1, is_omaggio: false, prezzo_unitario: 100,
      data_ordine: o.data_ordine, cliente_id: 'c', azienda_id: 'a' }));
    const result = computeReorderForecast(rows, new Date(today));
    expect(result[0].numero_ordini).toBe(3);
    expect(result[0].primo_ordine).toBe('2026-01-01');
    expect(result[0].fatturato_totale).toBe(300);
    expect(computeReorderForecast(rows.slice(0, 2), new Date(today))).toEqual([]);
  });
});