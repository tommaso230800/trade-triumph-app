# Roadmap Evolutiva CRM AMG HO.RE.CA.

Hai chiesto 20 aree di miglioramento. È un progetto grande: se lo tocco tutto in un colpo solo rompo cose stabili e diluisco la qualità. Propongo di lavorare **a fasi verticali**, ognuna consegnata funzionante e testata, seguendo la tua stessa priorità (le "5 successive più importanti") e appoggiandola sulle infrastrutture che già abbiamo (metricsEngine, riconciliazione, alias, condizioni provvigionali).

Confermami la Fase 1 e parto subito. Le altre le rivediamo insieme prima di aprirle.

---

## Fase 1 — Documenti commerciali (base trasversale) — punto 1

Prerequisito di quasi tutto il resto (conferme d'ordine, note di credito, contratti, estratti). 

Cosa faccio:
- Nuovo bucket privato `documenti` + tabella `documenti` con: entità collegata (ordine / cliente / azienda / provvigione / reclamo), tipo (`ordine_originale`, `conferma_ordine`, `fattura`, `nota_credito`, `contratto`, `listino`, `accordo_provv`, `promo`, `email`, `estratto_provv`, `altro`), file, mime, dimensione, tag, note, hash.
- Upload drag&drop + preview PDF/immagine in scheda Cliente, Azienda, Ordine, Provvigione.
- Auto-classificazione: piccola edge function che dal nome file + prime pagine (Gemini) propone tipo documento e entità candidate (es. "conferma d'ordine Polara" → suggerisce ordine di Polara della settimana). L'utente conferma con un click.
- Timeline documenti per entità.

Deliverable: sezione "Documenti" visibile in Cliente / Azienda / Ordine / Provvigione con caricamento e auto-collegamento.

---

## Fase 2 — Le 5 priorità che hai indicato

### 2A · Confronto ordine CRM ↔ conferma azienda (punto 2)
- Riuso l'infrastruttura di `parse-order-multi` per estrarre righe dalla conferma PDF/Excel.
- Nuovo motore `orderMatchEngine.ts`: confronta riga per riga (prodotto via alias, quantità pz/ct, prezzo, sc1/sc2/sc3, omaggi, pagamento, destinazione, data consegna).
- UI "Verifica conferma" nella scheda ordine con badge per differenza (mancante, quantità errata, prezzo diverso, sconto mancante, omaggio mancante, sostituito, parziale).
- Stato ordine arricchito con `verificato_conferma` (bool) + data.

### 2B · Reclami + Note di credito (punti 4 e 5, unificati)
- Tabella `segnalazioni` (tipo, stato, responsabile, importo, allegati, timeline email/risposte, scadenza, soluzione).
- Sotto-flusso "Nota di credito" con stati `da_richiedere → richiesta → sollecitata → approvata → emessa → ricevuta → chiusa` + solleciti automatici quando la pratica resta ferma oltre soglia.
- Pagina dedicata "Segnalazioni" + widget dashboard "Pratiche aperte / NC attese".

### 2C · Previsione riordino e clienti da contattare (punto 11)
Estendo il `reorder_tracking` già presente:
- Aggiungo previsione **per prodotto** (non solo per cliente/azienda): intervallo medio, ultima quantità, data prossimo riordino stimato.
- Widget "In rottura tra X giorni" con azione rapida "Contatta / Prepara proposta".

### 2D · Promozioni e omaggi automatici (punto 7)
- Sui `promo_clienti` / `contratti_clienti` aggiungo campi `qta_base`, `qta_omaggio` (es. 80+4) e `cumulabile_arretrati`.
- In creazione ordine: calcolo omaggi spettanti in tempo reale sulla quantità inserita, con banner "spettano 12 omaggi, inseriti 8 → mancano 4" e bottone "Aggiungi omaggi mancanti".
- Report "Omaggi arretrati" per cliente.

### 2E · Consegne e rotture di stock (punto 3)
- Estendo `ordini` con `data_consegna_prevista`, `stato_consegna` (da_consegnare, in_consegna, consegnata, parziale, problema), `problema_consegna` (enum), `destinazione_consegna`.
- Nuova sezione "Consegne" con filtri (oggi, in ritardo, parziali, problemi) e generazione automatica di un'attività/segnalazione per ogni anomalia.

---

## Fase 3 — Intelligenza commerciale (punti 6, 12, 13, 14, 15)
Controllo prezzi/condizioni in fase d'ordine, classificazione automatica clienti (nuovo/attivo/in calo/perso/recuperato), archivio opportunità, obiettivi per mandante/cliente/prodotto, simulatore chiusura mese.

## Fase 4 — Operatività quotidiana (punti 8, 9, 10, 16, 17)
Incassi e affidabilità cliente (con blocco/rilascio provvigione), mappa zone + percorsi visite ottimizzati (Google Maps già disponibile come connector), pianificazione settimanale, centro comunicazioni (email/WA/PDF precompilati dai dati CRM), sistema follow-up automatici.

## Fase 5 — Multiutente e sicurezza (punto 18)
Ruoli (`admin`, `agente`, `collaboratore`, `amministrazione`, `brand_ambassador`, `readonly`) via tabella `user_roles` + `has_role()`, aggiornamento RLS di tutte le tabelle sensibili.

## Fase 6 — Backup, esportazioni, salute tecnica (punti 19, 20)
Cestino con soft delete su tabelle chiave, export completo strutturato (JSON/ZIP), pagina "Diagnostica" con stato backend/DB, errori recenti, import falliti, query lente, ultimo backup. Ottimizzazioni: virtualizzazione tabelle grandi, indici mirati, paginazione server-side, cache mirata.

---

## Dettagli tecnici (per riferimento)

```text
Fase 1
  bucket: documenti (private)
  table:  documenti (entity_type, entity_id, tipo, storage_path, hash, meta jsonb)
  edge:   classify-document (Gemini) → suggerisce tipo + entità

Fase 2A
  engine: src/lib/orderMatchEngine.ts
  table:  ordini_conferme (ordine_id, documento_id, esito jsonb, verificato_at)

Fase 2B
  tables: segnalazioni, segnalazioni_eventi, note_credito (view su segnalazioni tipo=NC)

Fase 2C
  view:   v_reorder_prodotto (cliente, azienda, prodotto, media_gg, prossimo)

Fase 2D
  cols:   promo_clienti.qta_base, qta_omaggio, cumulabile_arretrati
  hook:   useOmaggiCalcolati(ordineDraft)

Fase 2E
  cols:   ordini.data_consegna_prevista, stato_consegna, problema_consegna, destinazione_consegna
```

---

## Cosa mi serve da te

1. Confermi che partiamo dalla **Fase 1 (Documenti)**? È la base per 2A, 2B e 5 tra le priorità.
2. In alternativa posso andare dritto sulla **Fase 2A (confronto conferme)** che è la #1 della tua lista, ma senza documenti allegati la conferma sarà solo "one shot" (analizzata e scartata, non archiviata).

Dimmi quale delle due preferisci e apro solo quella.
