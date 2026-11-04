# Restyling premium + Intelligence Riordini predittiva

Specifica: restyling di File e Documenti, Locandine e Proposte, e trasformazione di Riordino in sistema di intelligenza commerciale con grafici predittivi. Tutto collegato al database reale, nessun dato inventato, nessuna funzionalità esistente rimossa.

## 1. Motore statistico riordini (cuore del lavoro)

Nuovo `src/lib/reorderIntelligence.ts`, deterministico e testabile, che per ogni coppia cliente–azienda calcola dagli ordini reali (esclusi annullati/bozze/duplicati, stesso giorno senza falsi intervalli):

- Intervalli tra ordini, **mediana**, media, dispersione, frequenza storica consolidata e frequenza recente (ultimi 5 ordini → 4 intervalli), con peso maggiore ai dati recenti senza perdere la baseline.
- **Tolleranza 6 giorni** (configurabile 5–7, persistita per utente): entro frequenza = regolare, oltre = in tolleranza, oltre tolleranza = ritardo rosso.
- **Rallentamento anomalo** (arancione): ultimo intervallo >30% e ≥7 giorni sopra la frequenza abituale, adattato alla variabilità storica.
- **Rallentamento persistente** (rosso): 2+ intervalli consecutivi anomali. Un nuovo ordine non cancella la segnalazione; il sospetto rientra progressivamente dopo più cicli regolari.
- **Calo dei volumi** (segnalazione distinta): quantità/valore medio recente vs storico, senza confonderlo col rallentamento di frequenza.
- **Prodotti non riordinati**: frequenza per singolo prodotto (minimo 3 acquisti), ritardo rosso se supera frequenza + tolleranza mentre il cliente compra altro; un nuovo ordine risolve solo gli allarmi dei prodotti effettivamente riordinati.
- **Affidabilità**: alta/media/bassa/insufficiente; niente allarmi su storico insufficiente o clienti occasionali.
- **Priorità commerciale** (alta/media/bassa) con spiegazione testuale del punteggio.

Test unitari per le condizioni della specifica: frequenza regolare 30–35 gg, ritardo oltre tolleranza, primo intervallo 50 gg, due intervalli 50+52, rallentamento che permane dopo nuovo ordine, ritorno progressivo, prodotto non riordinato, calo volumi a frequenza invariata, storico insufficiente.

## 2. Grafici interattivi (recharts, già presente)

Nuovi componenti in `src/components/riordino/`:

- **Grafico frequenza di riordino**: linea intervalli reali (punti verdi regolari, arancioni anomali, rossi persistenti), linea tratteggiata frequenza abituale, seconda tratteggiata soglia tolleranza, zona evidenziata per rallentamenti consecutivi. Tooltip con date, numero ordine, giorni, scostamento e link all'ordine. Touch su iPhone.
- **Grafico evoluzione consumi**: colonne quantità/valore per ordine o mese, media storica, scelta unità (cartoni/pezzi/valore) senza sommare unità incompatibili.
- **Timeline prodotti non riordinati**: per prodotto ultimo acquisto, frequenza, data prevista, ritardo; filtro per selezionare pochi prodotti alla volta.
- **Previsione prossimo riordino**: storico reale + data stimata con finestra di tolleranza, resa visivamente diversa (tratteggio/zona) e con incertezza esplicita quando l'affidabilità è bassa.
- **Grafico portafoglio** nella dashboard: evoluzione nel tempo di regolari/ritardo/sospetti/persistenti, filtrabile per azienda, senza doppi conteggi.

Sopra il grafico principale: 4 KPI (frequenza abituale, frequenza recente, rallentamento %, prossimo riordino) + segnalazione esplicativa se sospetto.

## 3. Pagina Riordino ridisegnata

- KPI cliccabili in alto: monitorati, previsti, in ritardo, sospetti, rallentamenti persistenti, prodotti non riordinati, calo volumi, inattività prolungata — conteggi reali.
- **Centro allarmi "Intelligence commerciale"** con le 6 sezioni, ogni segnalazione con motivo e dati numerici.
- **Card cliente–azienda** moderne: ultimo ordine, frequenze, prossimo previsto, ritardo, variazione %, prodotti in ritardo, calo volumi, stato; azioni Apri/Grafici/Ordini/Crea ordine/Nota/Monitorato. La card apre il dettaglio con i grafici.
- Filtri combinabili (azienda, cliente, stato, sospetto, ritardo, rallentamento, prodotto, volumi, priorità, affidabilità) e ordinamento per ritardo/rallentamento/valore/priorità.
- Comando "Ricalcola intelligence riordini".
- Le previsioni per singolo prodotto esistenti restano come drilldown separato.

## 4. Restyling File e Documenti

- Dashboard documentale compatta: documenti, cartelle, nuovi file, analisi AI completate, errori — numeri reali.
- Griglia/elenco, cartelle con icone, anteprime dove supportate, filtri per azienda/cliente/tipo/data, azioni rapide e menu contestuali, ricerca intelligente.
- OneDrive e Documenti CRM restano lo stesso archivio (sincronizzazione totale già attiva); design responsive iPhone.

## 5. Restyling Locandine e Proposte

- Dashboard iniziale con conteggi per stato, sezioni distinte Locandine/Proposte, galleria con anteprime reali, card eleganti, ricerca/filtri, stati completi (bozza, inviata, in attesa, accettata, rifiutata, scaduta), modifica/duplicazione/PDF/eliminazione/condivisione.
- Editor e accettazione esistenti invariati nella logica; accettazione aggiorna Canvass/PFA solo dopo conferma (già garantito).

## 6. Verifiche

- Test del motore (condizioni 1–9 della specifica) + test esistenti.
- Build OK; Playwright 320/375/430 px senza overflow sulle tre pagine; tooltip e soglie verificati su dati reali.
- Nessun dato fittizio; nessuna modifica automatica a dati commerciali.

## Note tecniche

- Motore puro in `src/lib/reorderIntelligence.ts` (nessuna dipendenza nuova; recharts 2.15 già installato).
- Hook `useReorderIntelligence` che riusa il caricamento paginato ordini+righe esistente; invalidazione automatica dopo ogni modifica ordini.
- Tolleranza e preferenze in `localStorage` + impostazione persistita; nessuna migrazione distruttiva.
- AGENTS.md: regola "intelligence riordini calcolata da motore statistico condiviso; baseline storica separata dalla frequenza recente".
