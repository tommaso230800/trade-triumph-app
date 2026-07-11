## Obiettivo
Rimuovere le vecchie sezioni "Assistente Trattativa" e "Trattative" e sostituirle con una nuova sezione unica **"Assistente AI"** che analizza note libere (testo o voce) dell'agente e propone azioni da confermare prima di scriverle nel database.

---

## 1. Rimozioni

**Sidebar / Routing (`src/components/layout/Sidebar.tsx`, `src/App.tsx`)**
- Rimuovere le voci di menu "Trattative" e "Assistente Trattativa".
- Rimuovere le route `/trattative`, `/trattative/:id`, `/assistente-trattativa`.
- Mantenere invariata la voce esistente "AI Commerciale" (funzionalità distinta).

**File rimossi**
- `src/pages/Trattative.tsx`
- `src/pages/TrattativaDettaglio.tsx`
- `src/pages/AssistenteTrattativa.tsx`
- Componenti in `src/components/trattativa/*` (non più referenziati).
- Hook `src/hooks/useTrattativa.tsx`, `src/hooks/useDeals.tsx` (se non usati altrove — verificare prima).

Le tabelle DB `deals`, `deal_messages`, `storico_trattative`, `template_trattativa` restano (nessuna DROP: si evita perdita dati). Verranno semplicemente non più utilizzate dal frontend.

---

## 2. Nuova sezione "Assistente AI"

### Menu & Route
- Nuova voce sidebar "Assistente AI" (icona `Sparkles` o `Wand2`) → route `/assistente-ai`.
- Posizionata sotto "Note" per accessibilità.

### Pagina `src/pages/AssistenteAI.tsx`
Layout mobile-first, verticale, con:
- Header: titolo "Assistente AI" + sottotitolo "Registra visite, crea promemoria e prepara comunicazioni".
- **Textarea grande** con placeholder richiesto.
- **Pulsante microfono** (Web Speech API `webkitSpeechRecognition`, fallback nascosto se non supportato) accanto/dentro la textarea.
- **Pulsante "Analizza nota"** primario.
- **Sezione "Risultato dell'analisi"**: scheda editabile con tutti i campi (cliente combobox, azienda combobox, tipo attività select, data attività, riepilogo textarea, priorità select colorata, prossima azione, data/ora promemoria, stato select, bozza comunicazione textarea + pulsanti Copia/Modifica/Salva).
- **Sezione "Azioni da confermare"**: lista di card, ognuna con descrizione, tipo, pulsanti Conferma / Modifica / Ignora. In fondo pulsante primario "Conferma tutte le azioni".
- **Sezione "Attività recenti"**: ultime 10 righe da `ai_activity_log` con stato e riepilogo.

### Componenti nuovi
- `src/components/assistente-ai/RisultatoAnalisiCard.tsx`
- `src/components/assistente-ai/AzioniProposteList.tsx`
- `src/components/assistente-ai/AttivitaRecentiList.tsx`
- `src/components/assistente-ai/ClienteAziendaCombobox.tsx`

### Hook
- `src/hooks/useAssistenteAI.tsx` — mutazione `analizza(note)` che chiama la edge function e salva `ai_activity_log` (stato `analizzato`), query `useAttivitaRecenti`, mutazione `confermaAzioni(azioni)` che esegue gli INSERT su `visite`/`promemoria` in transazione client-side e aggiorna il log.

---

## 3. Database

Verifica esistenti:
- `visite` (11 col): riusare, ma verificare la struttura. Potrebbe mancare `prossima_azione` / `priorita` / `stato` → **estendere via ALTER TABLE** solo se mancanti.
- `promemoria` (11 col): riusare così com'è, verificare compatibilità con i campi richiesti.
- `clienti`, `aziende`: riusare.

**Nuova tabella `ai_activity_log`** (unica CREATE):
- Campi: `id`, `user_id`, `input_originale`, `risultato_analisi` (jsonb), `azioni_proposte` (jsonb), `azioni_confermate` (jsonb), `stato` (`analizzato` / `confermato` / `parziale` / `errore` / `ignorato`), `messaggio_errore`, `created_at`.
- RLS: solo owner (`auth.uid() = user_id`).
- GRANT su `authenticated` + `service_role`.

Migration unica che:
1. Verifica ed estende `visite` con eventuali colonne mancanti (`priorita text`, `stato text`, `prossima_azione text`) — solo `ADD COLUMN IF NOT EXISTS`.
2. Crea `ai_activity_log` con GRANT + RLS + policy.

---

## 4. Edge Function `analyze-note`

`supabase/functions/analyze-note/index.ts`
- Riceve `{ note, clienti: [{id,nome}], aziende: [{id,nome}] }` (elenchi passati dal client per matching).
- Chiama Lovable AI Gateway (`google/gemini-3-flash-preview`) con structured output (tool calling) per estrarre:
  - `cliente_id` (match fuzzy sui nomi passati) o `cliente_nome_suggerito`
  - `azienda_id` o `azienda_nome_suggerita`
  - `tipo_attivita` (enum)
  - `data_attivita` (ISO)
  - `riepilogo`
  - `priorita` (bassa/media/alta/urgente)
  - `prossima_azione`
  - `data_promemoria` (ISO datetime)
  - `stato` (default "da_fare")
  - `bozza_comunicazione`
  - `informazioni_mancanti[]`
  - `azioni_proposte[]` con `{tipo: "crea_visita"|"crea_promemoria"|"salva_bozza", descrizione, payload}`
- CORS + gestione 429/402.
- Nessuna scrittura DB dall'edge function: la conferma la fa il client dopo approvazione utente.

---

## 5. Sicurezza / Regole
- Nessuna azione DB prima del click "Conferma".
- L'assistente non invia email, non elimina, non tocca ordini/fatture/provvigioni.
- Bozza comunicazione solo copiabile/salvabile in `ai_activity_log.risultato_analisi`.

---

## 6. Note tecniche
- Web Speech API: `SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition`; lingua `it-IT`; pulsante mostrato solo se disponibile.
- Combobox cliente/azienda: usare shadcn `Command` con ricerca.
- Mobile: textarea `min-h-[180px]`, pulsanti `touch-target`, layout verticale singola colonna.

---

## Ordine di esecuzione
1. Migration DB (estensione `visite` + nuova tabella `ai_activity_log`).
2. Edge function `analyze-note` + deploy.
3. Hook `useAssistenteAI`.
4. Pagina + componenti.
5. Sidebar/App.tsx: aggiungere "Assistente AI", rimuovere Trattative/Assistente Trattativa.
6. Eliminare i file delle pagine/componenti rimossi.
