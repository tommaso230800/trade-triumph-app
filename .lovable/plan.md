# Trasformazione pagina KPI in Dashboard Commerciale Avanzata

## Obiettivo
Trasformare `/kpi` da pagina di statistiche generiche in uno strumento operativo che mostri **dove vendo bene, dove perdo, dove posso crescere**, con confronti anno su anno e collegamento diretto a clienti, prodotti, aziende e visite.

## Approccio per fasi
Il lavoro è enorme. Lo divido in **3 fasi successive**, così la pagina resta usabile dopo ogni fase e tu puoi dare feedback prima di proseguire.

---

## FASE 1 — Fondamenta dati + KPI Hero + Confronto anno (questa iterazione)

### 1.1 Hook dati unificato `useKPIAnalytics`
Un solo hook che, dato un range di date e i filtri, restituisce:
- Totali periodo corrente + stesso periodo anno precedente (calcolato da `data_ordine`)
- Aggregati per **prodotto**, **azienda**, **brand**, **cliente** (sia anno corrente che precedente)
- Serie mensile fatturato/pezzi/ordini

Calcoli lato client su `ordini` + `ordini_righe` + `prodotti` + `clienti` + `aziende` + `brands`, con `useMemo` per evitare ricalcoli.

### 1.2 Header KPI Hero (card in alto)
Card sempre visibili, ognuna con valore + delta % vs anno prec:
- Fatturato totale, Pezzi venduti, Ordini, Valore medio ordine
- Clienti attivi, Clienti dormienti (>60gg), Nuovi clienti
- Best: azienda / prodotto / cliente
- Worst: prodotto in calo / cliente in calo

### 1.3 Filtri (sticky bar)
- Periodo: mese / trimestre / semestre / anno / custom
- Multi-select: azienda, brand, cliente, categoria (tipologia_cliente)
- Toggle rapidi: solo in crescita / solo in calo / solo dormienti

### 1.4 Tab "Andamento": confronto anno su anno
- Grafico combinato barre 2025 vs 2026 per mese (riuso `YearComparisonChart` esteso)
- Tabella mensile: Mese | Anno prec | Anno corr | Diff € | Diff %
- Indicatori visivi crescita (verde) / calo (rosso)

---

## FASE 2 — Analisi dimensionali (iterazione successiva)

### 2.1 Tab "Prodotti"
- Classifica top venduti (barre)
- Tabella prodotti: pezzi YoY, fatturato YoY, Δ%, # clienti che lo comprano, # clienti persi sul prodotto
- Sezioni rapide: in crescita / in calo / fermi (no riordini in 90gg)
- Click su prodotto → drawer con: andamento mensile, lista clienti attivi, clienti potenziali (che comprano stessa azienda ma non quel prodotto)

### 2.2 Tab "Aziende & Brand"
- Donut peso % per azienda sul totale
- Tabella aziende: fatturato YoY, pezzi, clienti attivi/persi, Δ%, top/worst prodotto
- Stessa vista per brand

### 2.3 Tab "Clienti"
- Tabella: fatturato YoY, Δ€, Δ%, ultimo ordine, freq media (da `reorder_tracking`), status
- Segmenti rapidi: migliori / in crescita / in calo / dormienti / persi
- Prodotti comprati lo scorso anno ma non ancora riordinati quest'anno
- Click cliente → naviga a `/clienti/:id` (già esistente)

---

## FASE 3 — Opportunità + AI + Azioni (iterazione successiva)

### 3.1 Tab "Opportunità"
Regole automatiche (no AI, solo SQL/JS) che generano insight:
- Clienti -X% YoY
- Prodotti non riordinati da clienti storici
- Prodotti con bassa distribuzione ma alta rotazione
- Clienti con concorrenza attiva (da `competitor_products`) → proposta sostituzione
- Cross-selling: chi compra X ma non Y nella stessa azienda

### 3.2 Sezione "Analisi AI"
Edge function `analyze-kpi` (Lovable AI, `google/gemini-2.5-flash`) che riceve gli aggregati e produce:
- Sintesi "dove vai bene / dove vai male"
- Top 5 clienti da visitare con motivazione
- Top 5 prodotti da spingere
- Opportunità cross-selling

### 3.3 Tabella "Azioni consigliate"
Colonne: Priorità | Cliente | Problema | Opportunità | Azione → bottoni rapidi:
- "Prepara visita" → `/prepara-visita?cliente=:id`
- "Apri scheda" → `/clienti/:id`
- "Crea proposta" → `/assistente-trattativa?cliente=:id`

---

## Dettagli tecnici

- Tutti i calcoli YoY usano `data_ordine` (mai `created_at`) — già regola di progetto.
- Esclusi sempre `status = 'annullato'`.
- Categoria merceologica = `clienti.tipologia_cliente` (bar/ristorante/etc) per ora; se servirà categoria prodotto la aggiungeremo come campo separato in futuro.
- "Cliente dormiente" = ultimo ordine > 60 giorni fa. "Perso" = > 180 giorni.
- Tema invariato (Vibrant Dark Multi-Accent), card con `surface-noir`, animazioni `animate-rise-in`.
- Mobile: tab orizzontali scrollabili, tabelle in scroll-x.

## Cosa serve da te
Conferma di partire dalla **Fase 1** così la pagina diventa subito più utile (KPI hero + confronto YoY funzionante con filtri), e poi proseguo con Fase 2 e 3 nei prossimi messaggi. Se preferisci un ordine diverso (es. partire da Opportunità o AI) dimmelo.
