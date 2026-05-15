# Preparazione Visite AI – Piano

Obiettivo: ciclo completo **Cliente → Prepara visita AI → Salva → Report visita → Storico → Nuova prep AI migliorata**, con concorrenza cliente strutturata e usata dall'AI.

## 1. Database (nuova migration)

Nuove tabelle (tutte con RLS `auth.uid() = user_id`):

- **competitor_products** – prodotti concorrenti per cliente
  - cliente_id, categoria, nome, marca, formato
  - prezzo_acquisto, prezzo_vendita, margine_stimato, sconto, omaggi
  - condizioni, pagamento, frequenza, quantita_abituale
  - agente_concorrente, soddisfazione (1-5)
  - punti_forti, punti_deboli
  - nostro_prodotto_id (FK prodotti, opzionale), nostro_prezzo, vantaggio
  - priorita (alta/media/bassa), stato (da_attaccare/da_monitorare/difficile/sostituito/perso)
  - foto_url, note, last_updated_at

- **visit_preparations** – preparazioni AI
  - cliente_id, visit_date, status (preparata/visita_fatta/report_compilato/archiviata)
  - riepilogo_cliente, storico_commerciale, analisi_concorrenza (text)
  - obiettivo_visita, proposta_consigliata, argomenti_vendita (text)
  - obiezioni_previste, domande_consigliate, prossima_azione (text)
  - contenuto_completo (jsonb – output AI strutturato)

- **visit_reports** – report visita
  - cliente_id, visit_preparation_id (FK), data_visita
  - esito, ordine_preso (bool), valore_ordine
  - prodotti_ordinati, prodotti_proposti, prodotti_proposti_non_ordinati (jsonb)
  - concorrenza_rilevata (jsonb – sync verso competitor_products)
  - obiezioni, risposte_date (text)
  - interesse_cliente (basso/medio/alto), umore_cliente (freddo/normale/positivo/molto_interessato)
  - promozioni_discusse, campioni_lasciati, espositori_richiesti, materiale_promozionale (text)
  - prossima_azione, data_follow_up, note

Estensione tabella **clienti**: aggiungo solo `livello_relazione` (1-5) e `potenziale_cliente` (basso/medio/alto/strategico) – il resto già esiste (anagrafica, tipologia, condizioni, fatturato, note, consorzio…).

Riuso tabelle esistenti: `ordini` + `ordini_righe` (storico ordini), `client_notes` (note), `promo_clienti` (promo proposte), `reorder_tracking` (frequenza).

## 2. Edge Function AI: `prepare-visit`

Input: `cliente_id`. La function:
1. Carica anagrafica cliente, ultimi 50 ordini con righe, prodotti più frequenti, prodotti non riordinati, promo attive/storiche, note, competitor_products, ultimi 5 visit_reports, follow-up aperti.
2. Costruisce un prompt strutturato e chiama Lovable AI Gateway (`google/gemini-2.5-pro` per qualità) con tool calling per output JSON con tutte le sezioni richieste.
3. Inserisce una riga in `visit_preparations` con status `preparata` e ritorna l'oggetto.

`supabase/config.toml`: aggiungo `[functions.prepare-visit] verify_jwt = true` (richiede auth utente per RLS).

## 3. Hook & componenti frontend

Hook nuovi:
- `useCompetitorProducts(clientId)` – CRUD competitor
- `useVisitPreparations(clientId)` – list/get/create/update/delete
- `useVisitReports(clientId)` – list/get/create/update + sync competitor
- `usePrepareVisitAI()` – mutation che invoca la edge function

Componenti nuovi (`src/components/visite/`):
- `CompetitorProductCard.tsx` + `CompetitorProductDialog.tsx` – sezione concorrenza
- `VisitPreparationView.tsx` – mostra/modifica la preparazione AI (sezioni collassabili)
- `VisitReportDialog.tsx` – form veloce report (chip selezionabili + textarea), include sotto-form "Aggiorna concorrenza rilevata" che fa upsert in competitor_products
- `VisitHistoryList.tsx` – timeline preparazione → report

Pagine:
- Modifico `ClienteDettaglio.tsx`: aggiungo tab/sezioni **Concorrenza**, **Storico visite**, **Preparazioni AI**, e bottone primario **"Prepara visita con AI"** in alto.
- Nuova pagina `src/pages/Visite.tsx` (rotta `/visite`) – dashboard visite: da fare / report da compilare / follow-up aperti / clienti senza visita / clienti con concorrenza attaccabile. Aggiungo voce in Sidebar.

## 4. Priorità clienti

Estendo `useClientStatus` / `usePriorityClients` per includere segnali nuovi: presenza competitor con priorità alta, follow-up aperti, prodotti abituali non riordinati. L'AI restituisce il "motivo priorità" nella prep.

## 5. Mobile-first

Tutti i nuovi dialog/sheet usano `max-h-[90dvh]` con scroll interno; report visita ottimizzato per smartphone (chip + textarea, niente tabelle).

## Note tecniche

- Output AI in JSON strutturato via tool calling → niente parsing fragile.
- `concorrenza_rilevata` nel report: array di `{competitor_product_id?, nome, prezzo, condizioni}` → upsert automatico in `competitor_products` al salvataggio.
- Memoria commerciale: la edge function include sempre gli ultimi report nel prompt → ogni visita migliora la successiva.

## Fuori scopo (per non sforare)

- Upload foto scaffale (placeholder URL per ora, storage in step successivo).
- Notifiche push follow-up.
