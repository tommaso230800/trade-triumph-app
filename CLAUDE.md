# CLAUDE.md — Linee guida di design e sviluppo

Queste linee guida vanno rispettate in OGNI modifica futura a questo progetto.

═══ IDENTITÀ ═══
CRM per agente di commercio Food & Beverage, usato ogni giorno sul campo: in auto, in piedi in un bar, davanti a un cliente. Riferimenti: Linear (densità e calma), Stripe (chiarezza dei numeri), Notion (spaziature). NON deve sembrare un gestionale generico né un template SaaS.
Principio guida: il valore è nella chiarezza del dato, non nella decorazione. Quando sei indeciso, TOGLI.

═══ TIPOGRAFIA ═══
Font già presenti: Space Grotesk (display/titoli), DM Sans (testo).
Scala rigida, nessun valore fuori scala:
- Numero KPI principale: text-3xl/text-4xl, font-bold, tracking-tight, tabular-nums
- Titolo pagina: text-2xl font-bold
- Titolo sezione/card: text-base font-semibold
- Corpo: text-sm
- Etichette e metadati: text-xs text-muted-foreground
Ogni numero (importi, quantità, percentuali) usa tabular-nums e allineamento a destra, così le cifre restano incolonnate.
Formattazione italiana ovunque: 12.450,80 € — mai formati misti.

═══ SPAZIATURA ═══
Solo multipli di 4px: gap-2 (8), gap-3 (12), gap-4 (16), gap-6 (24), gap-8 (32).
- Padding interno card: p-4 su mobile, p-6 su desktop
- Distanza tra sezioni: space-y-6
- Distanza tra elementi correlati: space-y-2
Mai valori arbitrari tipo p-[13px].

═══ COLORE ═══
Un solo accento: il primary blu. Tutto il resto è neutro.
Colori di stato SOLO per comunicare stato, mai per decorare:
- verde = pagato/confermato/in crescita
- ambra = in attesa/da confermare/attenzione
- rosso = scaduto/annullato/in calo
- blu = informativo/in corso
Regola: se un colore non comunica uno stato, non va usato.
Vietati: gradient decorativi, glow colorati, testo con gradient, sfondi animati.

═══ SUPERFICI ═══
- Card: bordo 1px sottile + un solo livello di ombra leggera. Mai ombre pesanti o multiple.
- Raggio angoli: rounded-xl per le card, rounded-lg per campi e pulsanti. Coerente ovunque.
- Elevazione: massimo 2 livelli in tutta l'app (superficie base, elemento sollevato).

═══ MOVIMENTO ═══
Animazioni SOLO come feedback di un'azione dell'utente: apertura modale, cambio stato, conferma.
Durata 150-250ms. Zero animazioni infinite, zero effetti al passaggio del mouse che spostano gli elementi.
Rispetta prefers-reduced-motion.

═══ MOBILE-FIRST (iPhone è il dispositivo principale) ═══
Verifica ogni pagina a 320px, 375px, 430px.
- MAI tabelle a scorrimento orizzontale su mobile. Trasformale in card compatte o righe espandibili.
- Ogni card-riga mostra: identificativo + il dato più importante + stato, il resto si apre al tocco.
- Aree toccabili minimo 44x44px.
- Azioni principali raggiungibili col pollice (parte bassa dello schermo).
- Rispetta le safe area dell'iPhone (notch e barra inferiore).
- Nessun elemento deve mai uscire dallo schermo: verifica che nessun contenitore forzi larghezze fisse.

═══ DENSITÀ DELLE INFORMAZIONI ═══
Un CRM professionale mostra molti dati senza pesare. Come:
- Ogni schermata ha UN dato protagonista, il resto è supporto visivo
- Progressive disclosure: dettagli nascosti dietro un tocco, non tutti in vista
- Le etichette ovvie si eliminano (il simbolo € basta, "Importo:" è ridondante)
- Le informazioni correlate stanno vicine; quelle non correlate separate da spazio, non da linee
- Righe di tabella: altezza uniforme, zebratura leggera o nessuna, mai bordi su ogni cella

═══ STATI (spesso trascurati, fanno la differenza) ═══
Ogni vista deve gestirli tutti:
- Caricamento: skeleton che ricalca la forma del contenuto reale. Mai spinner a schermo pieno.
- Vuoto: icona discreta + spiegazione + azione suggerita ("Nessun ordine questo mese — Crea ordine")
- Errore: cosa è andato storto e cosa fare, con pulsante Riprova. Mai messaggi tecnici grezzi.
- Successo: toast breve e non invasivo, con possibilità di annullare quando l'azione è distruttiva

═══ SPECIFICO PER IL LAVORO DELL'AGENTE ═══
Cose che rendono l'app davvero utile sul campo:
- Sul cliente: chiamata, WhatsApp, email, navigatore raggiungibili con un tocco
- Ogni cliente mostra sempre: ultimo ordine, fatturato vs anno scorso, se è in ritardo sul riordino
- Le scadenze e gli scoperti sono visivamente inequivocabili
- Ricerca sempre a portata, con risultati mentre si digita
- I filtri usati restano memorizzati tra una visita e l'altra
- Le azioni frequenti (nuovo ordine, nuova visita, nota) mai a più di 2 tocchi

═══ COMPONENTI CONDIVISI ═══
Prima di scrivere UI nuova, controlla se esiste già in src/components/ui.
Se lo stesso schema compare in 2+ pagine, estrai un componente condiviso.
Usa sempre i token in index.css e tailwind.config.ts. Mai colori o misure scritti a mano nelle pagine.

═══ VINCOLI ASSOLUTI ═══
- Non modificare logica di business, calcoli provvigioni/ordini, database, Supabase, auth, RLS
- Non rimuovere né rinominare funzioni esistenti
- Non installare dipendenze non necessarie
- Verifica sempre con `npm run build` prima di dire che hai finito
- Se una modifica rischia di rompere qualcosa, segnalalo invece di procedere
- **Nessun dato inventato, mai, per nessun motivo — ordini, importi, clienti, prodotti, storico.** Se manca un dato reale, chiedilo all'utente o lascialo N/D: non generarlo, non stimarlo spacciandolo per reale, non creare record "di comodo" per far tornare un grafico o un totale. (Causa nota: nell'agosto 2026 furono creati ordini 2025 inventati per Cantine Quattro Valli per simulare uno storico fatturato, mai richiesti come ordini — il dato voluto era un totale, non ordini finti. Hanno rotto il confronto anno su anno in Dashboard/Provvigioni ed è servita un'intera sessione di audit per isolarli.)

═══ CRITERIO FINALE ═══
Prima di considerare fatta una pagina, chiediti:
1. In mezzo secondo si capisce qual è il dato più importante?
2. Su iPhone in una mano funziona tutto?
3. C'è qualcosa che posso togliere senza perdere informazione?
Se la risposta a 3 è sì, toglilo.
