# Fase 2 — Motore di riconciliazione many-to-many

Obiettivo: passare dal confronto "1 riga PDF ↔ 1 ordine" a un motore che ragiona in **gruppi**. Un pagamento estratto può coprire più ordini; un ordine può essere spezzato su più righe di estratto (acconto + saldo, note credito, bonus). Tutto rimane ancorato a `ordini.totale` (fonte di verità Fase 1).

## Cosa cambia rispetto a oggi

Oggi (`useRiconciliazione.tsx`):
- ogni riga PDF cerca **il** miglior ordine → match esatto, probabile, mancante
- gli sconti/note credito diventano "phantom rows"
- pagamenti frazionati generano falsi delta

Domani:
- ogni riga PDF → **gruppo di ordini candidati** con quota di allocazione
- ogni ordine → **gruppo di righe PDF** che lo coprono (totale, parziale, con abbuono)
- il motore risolve il grafo bipartito e produce **allocazioni %** che quadrano ai centesimi

## Architettura

```text
┌──────────────┐   ┌───────────────────────┐   ┌──────────────┐
│ PDF righe    │──▶│ reconciliationEngine  │◀──│ CRM ordini   │
│ (estratti_…) │   │  (grafo + solver)     │   │ + righe      │
└──────────────┘   └──────────┬────────────┘   └──────────────┘
                              ▼
                    ┌──────────────────────┐
                    │ riconciliazioni_     │  ← nuova tabella
                    │ allocazioni (M:N)    │
                    └──────────┬───────────┘
                               ▼
                    KPI e stati coerenti
                    (ordini.provvigione_stato,
                     estratti_righe.stato_verifica)
```

## Step di implementazione

### Step 2.1 — Schema many-to-many
Nuova tabella `riconciliazioni_allocazioni` (migration):
- `estratto_riga_id` (FK)
- `ordine_id` (FK)
- `quota_imponibile`, `quota_provvigione` (importi allocati)
- `percentuale` (0-100)
- `tipo`: `intero | parziale | acconto | saldo | abbuono | bonus`
- `confidence` (0-100)
- `manuale` (bool: rettifica utente)
- RLS + GRANT standard

### Step 2.2 — `src/lib/reconciliationEngine.ts`
Motore puro TS (testabile, no side-effect):
1. **Candidate graph**: per ogni riga PDF, top-N ordini candidati (score = cliente/alias + importo ± tolleranza + finestra data + codice ordine)
2. **Bucket by client+company**: risolve un cluster per volta (evita esplosione combinatoria)
3. **Solver**:
   - 1↔1 perfetto → allocazione 100%
   - 1↔N (una riga PDF copre più ordini): partiziona per importi che sommano al totale PDF (subset-sum tollerante)
   - N↔1 (più righe PDF su un ordine): somma quote fino a raggiungere `ordini.totale`
   - N↔N: greedy con priorità a match esatti, residuo → abbuono/bonus
4. **Output**: array di allocazioni + residui inspiegabili (per l'anomaly center Fase 3)

### Step 2.3 — Hook `useReconciliationEngine.tsx`
- Sostituisce la logica match dentro `useRiconciliazione`
- Input: estratto selezionato + finestra temporale ordini
- Output: allocazioni + KPI aggregati (coperto, scoperto, sovrapagato, bonus)
- Persistenza in `riconciliazioni_allocazioni` on-demand

### Step 2.4 — UI: vista "Gruppi di allocazione"
Nuovo tab dentro `RiconciliazioneSection`:
- Card per **cluster** (cliente × azienda × trimestre)
- Ogni card mostra: totale PDF | totale CRM | Δ | grafo visivo delle allocazioni
- Azioni per gruppo: **Accetta tutto**, **Rialloca manualmente**, **Segna abbuono**
- Riallocazione drag: sposta quota da un ordine all'altro con slider %

### Step 2.5 — Ricalcolo KPI con allocazioni
Aggiornare `metricsEngine.ts`:
- `aggregateProvvigioniPagate(ordini, allocazioni)`: la provvigione pagata di un ordine è la **somma delle quote** dalle allocazioni confermate, non più il flag `provvigione_stato`
- Nuove funzioni: `revenueByAzienda`, `revenueByCliente` che rispettano le allocazioni per pagamenti parziali
- Backward compat: se un ordine non ha allocazioni, si comporta come oggi

### Step 2.6 — Integrazione Provvigioni
- Nuovo pannello nel tab **Riconciliazione**: "Gruppi non risolti" con residui
- KPI "Coperto/Scoperto/Sovrapagato" nella hero card di Provvigioni
- Colonna "Allocato %" nella tabella provvigioni (accanto allo stato)

## Cosa NON tocca questa fase

- Anomaly center completo → Fase 3
- Riconciliazione bancaria → Fase 3
- Chiusura trimestrale + audit log → Fase 4
- L'UI attuale della riconciliazione resta accessibile in parallelo (toggle "Vista classica / Gruppi") finché non validi il nuovo motore

## Ordine di consegna proposto

1. Step 2.1 + 2.2 (schema + engine puro) — nessun impatto UI
2. Step 2.3 (hook) — nessun impatto UI  
3. Step 2.4 (UI gruppi) — attivabile via toggle
4. Step 2.5 + 2.6 (KPI + integrazione Provvigioni)

Ogni step è indipendente e testabile in isolamento. Confermi che parto da 2.1 + 2.2?
