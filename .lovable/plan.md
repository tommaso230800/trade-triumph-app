# Piano — Rimozione Assistente AI + Potenziamento Intelligenza Commerciale e Provvigioni

Richiesta molto ampia. La divido in **5 fasi ordinate**, ciascuna consegnabile in autonomia. Confermami se procedere in blocco o fase per fase — consiglio fase per fase per verificare i dati reali dopo ogni step.

## Fase 1 — Pulizia: rimozione completa "Assistente AI"
- Rimuovere rotta `/assistente-ai` (`src/App.tsx`) e pagina `src/pages/AssistenteAI.tsx`.
- Rimuovere voce da `Sidebar.tsx`, `QuickActions.tsx`, `Index.tsx` e ogni link/bottone.
- Non tocco le tabelle `ai_attivita`, `ai_promemoria`, `ai_activity_log` (restano in DB inutilizzate — le rimuovo solo se me lo chiedi esplicitamente per non perdere storico).
- Mantengo edge function `analyze-note` in codice ma non più invocata (rimuovibile su richiesta).

## Fase 2 — Nuova struttura Intelligenza Commerciale
- Riscrittura `src/pages/IntelligenzaCommerciale.tsx` con 8 tab: Panoramica, Previsione fine mese, Clienti, Prodotti, Controllo prezzi, Ordini, Provvigioni, Anomalie & Opportunità.
- Barra filtri globali sticky: azienda, periodo (mese/trim/sem/anno/custom), agente (predisposto).
- Contesto React `IntelCommContext` per condividere filtri tra tab.
- Confronti: periodo precedente, YoY, media 3M, media 12M — helper in `src/lib/intelCommEngine.ts`.
- Tab scrollabili orizzontalmente su mobile con colori semantici (verde/blu/giallo/arancio/rosso).

## Fase 3 — Contenuto dei tab
- **Panoramica**: KPI cards (fatturato, ordini, clienti, prodotti, qty, AOV, valore/cliente, provv. maturate/pagate/da pagare) con delta €/% + grafici (linea fatturato, barre ordini, confronto aziende, YoY).
- **Previsione**: fix aliquota (usa `provvigioni_condizioni` via funzione `trova_condizione_provvigione`), fix storico 0€ (usa `metricsEngine`), 3 scenari (prudente/realistico/ottimistico) con clienti "gap-fill".
- **Clienti**: RFM esteso a 11 categorie, drill-down, sezione "Da contattare oggi" ordinata per priorità.
- **Prodotti**: top/flop, in crescita/calo, dormienti 30/60/90/180gg, confronto N prodotti, cross-selling suggerito.
- **Controllo prezzi**: estensione `computePriceControl` con tutte le tipologie richieste + azioni (apri ordine/cliente, verifica, promemoria, escludi con motivo). Nuova tabella `price_anomalies_resolved` per archivio.
- **Ordini**: controlli automatici (non evasi, stand-by, senza fattura, duplicati, totale anomalo, senza provvigione, mismatch CRM/estratti) + KPI tempi medi.
- **Anomalie & Opportunità**: due sottosezioni con priorità/valore economico stimato + CTA visita/promemoria.

## Fase 4 — Gestione Provvigioni per competenza vs pagamento
Cambio strutturale importante:
- **Migrazione DB**: aggiungere a `scadenziario_fatture` e/o `movimenti_provvigione`:
  - `trimestre_competenza` (derivato da `data_ordine`)
  - `trimestre_pagamento`, `anno_pagamento`
  - `estratto_id` (FK a `estratti_provvigioni`)
  - `data_pagamento_provvigione`, `note_pagamento`
- Backfill dai dati esistenti (competenza = quarter di `data_ordine`; pagamento = da riconciliazioni già confermate).
- Dialog obbligatorio quando si segna "pagata": chiede azienda/anno/trimestre/data estratto/PDF/note. Aggiorno `PagamentoProvvigioneDialog`.
- Upload PDF estratto: nuovo step "Metadata estratto" (azienda + anno + Q + data) prima del parsing — eredita a tutte le righe, editabile.
- Filtri Provvigioni: due filtri separati (competenza vs pagamento) con badge "Pagata nel Qx Yyyy" su ogni riga.
- Motore controlli: anomalia "provvigione mancante" **solo se** fattura incassata + termini superati + nessun estratto la contiene.

## Fase 5 — Report ed export + mobile QA
- Report giornaliero/settimanale/mensile/trimestrale/annuale in PDF (jsPDF già presente) ed Excel (SheetJS già presente).
- QA mobile: tab scrollabili, no overlap, tabelle → card <640px, filtri sticky, header sticky, colori semantici, urgenze in cima.

## Dettagli tecnici
- Nessuna nuova dipendenza esterna (uso Recharts, jsPDF, SheetJS già installati).
- Le nuove metriche restano coerenti con `metricsEngine.ts` (fonte di verità = `ordini.totale`).
- Aliquote lette con `calcola_provvigione_prevista` / `trova_condizione_provvigione` già esistenti.
- Motori nuovi in `src/lib/`: `intelCommEngine.ts`, estensioni a `commercialIntelligenceEngine.ts`, `reorderForecastEngine.ts`.
- Nuova tabella `price_anomalies_resolved` con RLS per user_id + admin.
- Migrazioni con GRANT completi come da convenzione.

## Domande prima di partire
1. Procedo **fase per fase** (consigliato) o tutto in blocco?
2. Rimuovo anche le **tabelle DB** `ai_attivita`/`ai_promemoria`/`ai_activity_log` o le mantengo?
3. Per i dati storici già segnati "pagata" senza trimestre di pagamento: uso la data di pagamento esistente per derivarlo automaticamente, oppure li lascio "da assegnare" per revisione manuale?
