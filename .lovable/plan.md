
# Redesign Pagina Provvigioni — Centro di Controllo Economico

Trasformo `Provvigioni` da elenco fatture in una dashboard professionale in stile Notion + Stripe + Linear, coerente col tema dark del CRM (Space Grotesk + DM Sans, semantic tokens).

## 1. Database — estensione `scadenziario_fatture`

Nuova migration che aggiunge (senza rompere campi esistenti):

- `stato_provvigione` TEXT — enum: `da_pagare` | `pagata` | `parziale` | `contestazione` (default `da_pagare`)
- `importo_provvigione_pagata` NUMERIC default 0
- `metodo_pagamento_provvigione` TEXT
- `note_provvigione` TEXT
- `data_pagamento_provvigione` DATE (rinomina logica di `data_incasso_provvigione`, mantenuto per compat)

Backfill: righe con `provvigione_incassata = true` → `stato_provvigione = 'pagata'` e `importo_provvigione_pagata = provvigione_calcolata`.

## 2. Struttura pagina (`src/pages/Provvigioni.tsx`)

Layout a sezioni verticali con sticky filter bar in alto:

```text
┌────────────────────────────────────────────────────────┐
│ FILTRI STICKY: Azienda ▾ | Periodo ▾ | Cliente ▾ | 🔍  │
├────────────────────────────────────────────────────────┤
│ CONTO ECONOMICO PERSONALE (hero band)                  │
│  Oggi | Mese | Anno | Media/gg | Previsione fine mese  │
├────────────────────────────────────────────────────────┤
│ 10 KPI CARDS (grid 5×2 desktop, 2×5 mobile)            │
├────────────────────────────────────────────────────────┤
│ Tabs: Overview | Provvigioni | Aziende | Clienti |     │
│       AI Insights | Calendario | Simulatore | Bonus    │
└────────────────────────────────────────────────────────┘
```

### Tab Overview — Grafici (Recharts)
- Andamento provvigioni 24 mesi (area chart)
- Fatturato vs Provvigioni (combo bar+line)
- Ripartizione provvigioni per azienda (pie/donut)
- Ripartizione per categoria prodotto (bar orizzontale)
- Heatmap mesi migliori (griglia colorata custom)
- Andamento giornaliero mese corrente + linea previsione fine mese

### Tab Provvigioni — Tabella principale
Filtri rapidi a pill: `Tutte` `Pagate` `Da pagare` `Parziali` `Contestazione`.
Colonne ordinabili + ricerca istantanea:
data · n° doc · azienda · cliente · categoria cliente · categoria prodotto · imponibile · sconti · netto · % provv · provv maturata · provv pagata · badge stato · data prevista · data effettiva · gg ritardo · note.
Azioni riga: menu con `Segna pagata`, `Segna parziale`, `Contestazione`, `Modifica note`.
Export Excel + PDF (xlsx già in progetto, jsPDF via CDN).

### Tab Aziende
Card per mandante: fatturato, provvigioni, media ordine, n° clienti, n° ordini, crescita %, sparkline, % incidenza sul totale.

### Tab Clienti
Classifica top clienti + sezioni auto: **In crescita** / **In calo** / **Inattivi** con badge Top Client.

### Tab AI Insights
Chiamata a `analyze-kpi` edge function (Lovable AI, `openai/gpt-5.5`) con payload aggregato: genera bullet insight tipo "Cliente X -32%", "Mandante Y +18%", "Previsione mese €XXXX", "Attenzione provvigioni Z in calo".

### Tab Calendario pagamenti
Timeline verticale con 3 colonne colorate: in arrivo (giallo), scaduti (rosso), ricevuti (verde).

### Tab Simulatore
Form: fatturato previsto, % provvigione, bonus, premi → risultato live in card grande.

### Tab Bonus
Elenco premi/bonus trimestrali/annuali/contest con progress bar (statico per ora, alimentabile in futuro).

## 3. Nuovo dialog `PagamentoProvvigioneDialog`

Apre da azione riga → campi: stato (radio 4 opzioni), data pagamento, importo pagato, metodo (contanti/bonifico/assegno/compensazione), note. Salva via mutation su `scadenziario_fatture`.

## 4. Componenti nuovi

- `src/components/provvigioni/ProvvigioniFilterBar.tsx` — filtri sticky con contesto condiviso
- `src/components/provvigioni/ContoEconomicoHero.tsx`
- `src/components/provvigioni/ProvvigioniKPIGrid.tsx`
- `src/components/provvigioni/ProvvigioniCharts.tsx` (contiene i 6 grafici)
- `src/components/provvigioni/ProvvigioniTable.tsx` con sort/search/export
- `src/components/provvigioni/PagamentoProvvigioneDialog.tsx`
- `src/components/provvigioni/StatoProvvigioneBadge.tsx`
- `src/components/provvigioni/AnalisiAziendeTab.tsx`
- `src/components/provvigioni/AnalisiClientiTab.tsx`
- `src/components/provvigioni/AIInsightsTab.tsx`
- `src/components/provvigioni/CalendarioPagamentiTab.tsx`
- `src/components/provvigioni/SimulatoreTab.tsx`
- `src/components/provvigioni/BonusTab.tsx`

## 5. Hook

- Estendo `useScadenziario` con mutation `aggiornaStatoProvvigione({id, stato, importo_pagato, data_pagamento, metodo, note})`.
- Nuovo `useProvvigioniAnalytics(filters)` che aggrega ordini/fatture per KPI, grafici, ripartizioni, previsioni.

## 6. Dettagli tecnici

- Tutto reattivo ai filtri via context `ProvvigioniFiltersContext`.
- Previsione fine mese: media giornaliera provvigioni MTD × giorni residui.
- Crescita MoM/YoY calcolate da `data_incasso` (fallback `data_fattura`).
- Export Excel: usa `xlsx` già installato. Export PDF: `jspdf` + `jspdf-autotable` (nuova dep).
- Design tokens esistenti, no colori hardcoded. Badge stato: `success`/`warning`/`destructive`/`muted`.
- Animazioni `animate-rise-in` sulle card, hover-lift sulle righe tabella.
- Zero modifiche a Ordini/Clienti/altre pagine.

## Fuori scope (esplicitamente esclusi)
- Sezione Obiettivi (rimandata)
- Multi-agente / colonne agente e zona (mono-agente)
- Modifiche allo schema oltre `scadenziario_fatture`
