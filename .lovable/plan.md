
# Fase 1 — Audit coerenza dati (SOLO ANALISI, nessuna modifica)

Come richiesto: non tocco ancora nulla. Ecco cosa ho trovato analizzando gli hook che alimentano Dashboard, KPI, Ordini e Provvigioni, e il piano di correzione da approvare prima di scrivere codice.

## Perché i numeri differiscono oggi

Ogni pagina ha una **formula indipendente**, con filtri e sorgenti diverse sugli stessi ordini. Ho verificato riga per riga:

### 1. Dashboard (`useStats.tsx`)
- Esclude: `annullato`, `stand_by`
- Data usata: `data_ordine || created_at` (fallback su created_at)
- Fatturato mensile = tutti gli ordini con data ≥ inizio mese corrente
- "Ordini totali" = TUTTI gli ordini del filtro (nessun range temporale)

### 2. KPI (`useKPIStats.tsx` + `useAdvancedKPIStats.tsx`)
- Esclude: `annullato`, `stand_by`
- Data usata: `data_ordine` (senza fallback su created_at nel filtro server) ma con fallback per il raggruppamento mensile
- Range: filtrato via `.gte/.lte("data_ordine", …)` → **esclude ordini con `data_ordine` NULL** che invece la Dashboard include
- Fatturato = somma `ordini.totale` (campo denormalizzato, potenzialmente non allineato alle righe)
- Fatturato per prodotto/brand = ricalcolato dalle righe (sc1/sc2/sc3, omaggi esclusi) → **base diversa dal fatturato totale**

### 3. Ordini (`useOrdini.tsx`)
- **Nessuna esclusione**: mostra anche `annullato` e `stand_by`
- Ordinamento per `data_ordine` desc (i NULL finiscono in fondo ma vengono contati)
- Il conteggio in pagina include stati che Dashboard/KPI escludono → discrepanza numerica garantita

### 4. Provvigioni (`useProvvigioniAnalytics.tsx`)
- Esclude: `annullato`, `stand_by`
- Data usata per bucket: `data_ordine || created_at`
- Provvigione = `totale * (aliquota_azienda/100)` **calcolata client-side**, ma il DB ha già `provvigione_prevista` calcolata dal trigger con la matrice → **due fonti di verità per la stessa provvigione**
- Non usa `data_conferma` per ordini stand-by riattivati (Dashboard/KPI sì, in parte)

### 5. Causa comune (bug strutturale)
- `ordini.totale` è un valore denormalizzato che non viene sempre ricalcolato quando le righe cambiano (omaggi, sconti). KPI/Dashboard leggono `totale`, i dettagli leggono le righe → totali diversi anche a parità di filtro.
- Nessun campo `data_riferimento` unificato: alcune pagine usano `data_ordine`, altre `data_conferma`, altre `created_at`. Per gli ordini importati da PDF senza data → finiscono in bucket diversi in ogni pagina.

## Piano di correzione (additivo, non distruttivo)

Prima di scrivere codice, propongo questi passi da fare **in questo ordine**, uno per volta, con conferma tra uno e l'altro:

### Passo 1.1 — Diagnosi quantitativa (SQL read-only)
Eseguo query di sola lettura sul DB per misurare esattamente lo scostamento:
- Numero ordini per stato
- Numero ordini con `data_ordine` NULL
- Numero ordini con `data_ordine ≠ created_at` (mesi diversi)
- Differenza tra `sum(ordini.totale)` e `sum(righe ricalcolate)` per ordine
- Ordini senza `azienda_id`, senza `cliente_id`, senza righe
- Duplicati potenziali (stesso cliente+azienda+data+totale)

Output: un report con i numeri esatti che spiegano le discrepanze attuali.

### Passo 1.2 — Motore unico delle metriche (`src/lib/metricsEngine.ts`)
Nuovo file **additivo** che espone funzioni pure:
- `getPeriodOrders(filters)` → una sola query, un solo set di esclusioni configurabile
- `computeRevenue(orders, mode: 'header' | 'lines')` → sceglie esplicitamente la base
- `computeCommissionStates(orders)` → 4 stati (prevista / riconosciuta / pagata / da_ricevere) letti dai campi già esistenti
- `getMetricsSnapshot(filters)` → oggetto unico con periodo, filtri, record inclusi/esclusi e motivazione

Nessun hook esistente viene modificato in questo passo. Il motore è pronto ma non collegato.

### Passo 1.3 — Adozione graduale in parallelo
Dashboard, KPI, Ordini e Provvigioni continuano a funzionare come oggi. Aggiungo in ognuna un **banner di trasparenza** (nascondibile) che mostra:
- Periodo analizzato
- Filtri attivi
- N record inclusi / esclusi + motivo
- Timestamp ultimo aggiornamento

Il banner legge dal motore unico → se i numeri della pagina divergono da quelli del motore, l'utente lo vede subito. Questo permette di validare il motore su dati reali PRIMA di sostituire le formule vecchie.

### Passo 1.4 — Switch controllato (solo dopo tua OK)
Una pagina alla volta, sostituisco la formula locale con la chiamata al motore. Ogni switch è un commit isolato, facilmente reversibile dalla History.

### Passo 1.5 — Pagina "Verifica integrità dati" (Impostazioni)
Nuovo componente read-only che elenca le anomalie rilevate dalle query del Passo 1.1, con link per aprire il record. Nessuna correzione automatica.

## Cosa NON tocco in questa fase

- Nessuna migrazione schema
- Nessuna modifica a UI di Dashboard/KPI/Ordini/Provvigioni oltre al banner di trasparenza
- Nessun campo rinominato
- Nessuna funzione rimossa
- Nessuna riscrittura di `useProvvigioniAnalytics`, `useKPIStats`, `useStats` finché il motore non è validato

## File che verranno creati/modificati (solo dopo la tua approvazione)

**Creati (nuovi):**
- `src/lib/metricsEngine.ts` (Passo 1.2)
- `src/components/common/DataTransparencyBanner.tsx` (Passo 1.3)
- `src/components/impostazioni/IntegrityCheckPanel.tsx` (Passo 1.5)
- `src/hooks/useIntegrityCheck.tsx` (Passo 1.5)

**Modificati (solo aggiunta banner, formule intatte):**
- `src/pages/Index.tsx` (Dashboard)
- `src/pages/KPI.tsx`
- `src/pages/Ordini.tsx`
- `src/pages/Provvigioni.tsx`
- `src/pages/Impostazioni.tsx`

**Zero migrazioni database in Fase 1.**

## Prossimo passo che chiedo di autorizzarmi

Eseguire il **Passo 1.1** — le query read-only di diagnosi — e mostrarti i numeri esatti. Da lì decidiamo se procedere col motore unico o se emergono anomalie che vanno affrontate prima.

Confermi di partire dal Passo 1.1?
