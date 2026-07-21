# Fasi 4 + 5 + 6 — Piano unico

Scope enorme (3 fasi = ~15 sotto-moduli, tocca DB, RLS, UI, integrazioni esterne). Le faccio tutte, ma in **ordine deterministico** per non rompere ciò che già funziona. Nessuna UI cambia prima che il backend sia pronto.

---

## Fase 5 — Ruoli & Sicurezza (PRIMA di tutto)

Va fatta per prima: la Fase 4 (incassi, comunicazioni) e la Fase 6 (soft delete, export) toccano tabelle sensibili — senza ruoli corretti si rischia di aprire buchi RLS.

- Enum `app_role`: `admin`, `agente`, `collaboratore`, `amministrazione`, `brand_ambassador`, `readonly`.
- Tabella `user_roles(user_id, role)` + funzione `has_role(_user_id, _role)` SECURITY DEFINER.
- Trigger su primo signup → assegna `admin` al primo utente, `agente` agli altri.
- RLS aggiornata su tabelle sensibili: `ordini`, `clienti`, `provvigioni_*`, `estratti_provvigioni*`, `scadenziario_fatture`, `movimenti_provvigione`, `documenti`, `segnalazioni*`, `omaggi_erogati`.
  - `admin` / `amministrazione`: full access
  - `agente`: solo propri `user_id` (comportamento attuale)
  - `collaboratore`: read+insert sui propri
  - `brand_ambassador`: read-only clienti/prodotti, write solo `visite`/`daily_reports`
  - `readonly`: solo SELECT
- Pagina **Impostazioni → Utenti & Ruoli** (solo admin): elenco utenti, cambio ruolo, invito nuovo utente.

---

## Fase 4 — Operatività quotidiana

### 4A — Incassi & affidabilità cliente
- Colonne `affidabilita_score` (0–100), `blocco_provvigione` (bool), `motivo_blocco` su `clienti`.
- Motore `src/lib/clientReliabilityEngine.ts`: calcola score da fatture scadute, DSO, insoluti, storico pagamenti.
- Regola: cliente con score < soglia → provvigioni relative marcate `bloccata` in `scadenziario_fatture.stato_provvigione`.
- UI in `ClienteDettaglio`: card "Affidabilità" con score, dettaglio insoluti, toggle blocco manuale.

### 4B — Mappa zone & percorsi visite
- Google Maps JS API tramite chiave utente (chiedo `GOOGLE_MAPS_API_KEY` con `add_secret`).
- Colonne `latitudine`, `longitudine` su `clienti` (geocoding on-demand al salvataggio indirizzo, edge function `geocode-client`).
- Pagina **Mappa** (`/mappa`): marker clienti colorati per priorità (Risk/Target/Potential/Routine), filtri zona, cluster.
- Bottone "Pianifica giro" → ottimizzazione ordine visite (algoritmo nearest-neighbor lato client, senza Directions API a pagamento).

### 4C — Pianificazione settimanale
- Tabella `pianificazione_settimanale(user_id, settimana, giorno, cliente_id, ora_prevista, note, stato)`.
- Pagina **Pianificazione** (`/pianificazione`): vista settimanale tipo agenda, drag & drop clienti da lista suggerimenti (riordino urgente + priorità).

### 4D — Centro comunicazioni
- Tabella `comunicazioni_log(cliente_id, canale, template, contenuto, inviata_at, stato)`.
- Templates precompilati (WhatsApp/Email/PDF): sollecito, offerta, follow-up, benvenuto.
- Edge function `render-comunicazione` che compila template con dati cliente/ordine.
- UI in `ClienteDettaglio`: bottone "Comunica" → dialog scelta template + canale + preview + apertura `wa.me` o `mailto:` o download PDF.

### 4E — Follow-up automatici
- Tabella `follow_up_regole(trigger, giorni_dopo, template, attivo)`.
- pg_cron job giornaliero → genera `promemoria` in base alle regole (es. "cliente senza ordini da X giorni", "fattura scaduta da Y giorni").

---

## Fase 6 — Backup, esportazioni, diagnostica

### 6A — Soft delete & cestino
- Colonna `deleted_at` timestamptz su: `clienti`, `ordini`, `prodotti`, `aziende`, `segnalazioni`, `documenti`, `notes`, `visite`, `contratti_clienti`, `promo_clienti`.
- Trigger che intercetta DELETE → converte in UPDATE `deleted_at = now()`.
- Views `*_active` che filtrano `deleted_at IS NULL` (per non riscrivere ogni query).
- Pagina **Cestino** (`/cestino`): tabella unificata (tipo, nome, data eliminazione, ripristina/elimina definitivo).
- Auto-purge dopo 30 giorni via pg_cron.

### 6B — Export JSON/ZIP
- Edge function `export-user-data`: genera ZIP con JSON di ogni tabella dell'utente + file storage referenziati.
- UI in **Impostazioni → Backup**: bottone "Scarica backup completo".

### 6C — Diagnostica
- Pagina **Diagnostica** (`/diagnostica`, solo admin):
  - Stato backend (ping edge function)
  - Ultimi errori (nuova tabella `error_log` + edge function che riceve errori client)
  - Import falliti (query su tabelle esistenti)
  - Query lente (via `supabase--slow_queries` mostrato nella UI se admin)
  - Ultimo backup effettuato
- Indici DB aggiuntivi: `ordini(user_id, data_ordine)`, `clienti(user_id, zona)`, `scadenziario_fatture(user_id, stato_provvigione, data_scadenza)`.

---

## Ordine esecuzione

1. **Migrazione 1** (Fase 5): enum + user_roles + has_role + RLS update tabelle sensibili.
2. **Migrazione 2** (Fase 4A + 6A): affidabilità clienti + soft delete + views.
3. **Migrazione 3** (Fase 4C + 4D + 4E + 6C): pianificazione, comunicazioni_log, follow_up_regole, error_log, indici.
4. **Migrazione 4** (Fase 4B): lat/lng clienti + edge function geocode-client.
5. **Secret**: chiedo `GOOGLE_MAPS_API_KEY` (solo se confermi Fase 4B con Google Maps).
6. **Codice**: engines (`clientReliabilityEngine`, `routeOptimizer`), hooks, pagine nuove, integrazioni in pagine esistenti, sidebar.
7. **pg_cron**: follow-up giornaliero + purge cestino.

---

## Rischi & note

- **Fase 5 può bloccare accesso** se un ruolo viene assegnato male: il primo utente diventa `admin` automaticamente, gli altri restano `agente` (comportamento attuale). Nessuno perde accesso.
- **Google Maps richiede una chiave a pagamento** (quota gratuita mensile Google c'è ma serve carta). Se non vuoi Google Maps, uso **Leaflet + OpenStreetMap** (gratis, nessuna chiave). Default: **Leaflet** se non specifichi.
- **Soft delete su tabelle esistenti**: le query attuali continuano a funzionare (i trigger convertono DELETE), ma le pagine mostrerebbero anche righe cancellate finché non passo a `*_active`. Migro le query principali (clienti, ordini, prodotti) subito, il resto in modo incrementale.
- **Volume totale**: ~4 migrazioni, ~3 edge functions, ~6 pagine nuove, ~10 hook, aggiornamenti a 15+ file esistenti. È tanto in un colpo — se qualcosa si rompe, faccio rollback della fase specifica.

Confermi con:
- **Mappa: Google Maps (con chiave) o Leaflet/OSM (gratis)?**
- **Vai con tutto?**
