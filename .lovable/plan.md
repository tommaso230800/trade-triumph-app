# Caricamento Multi-File Ordini con AI

## Obiettivo
Permettere il caricamento simultaneo di più file (PDF, immagini, Excel) per generare automaticamente più ordini distinti, con revisione obbligatoria prima del salvataggio.

## Regola d'oro
**1 file = 1 ordine separato** per default. L'unione richiede conferma manuale esplicita.

---

## Fase 1 — Backend: edge function unificata `parse-order-multi`

Nuova edge function che riceve un singolo file (PDF/immagine/Excel/testo) e restituisce uno o più ordini rilevati:

```json
{
  "orders": [
    {
      "cliente_nome": "...",
      "azienda_nome": "...",
      "tipo_pagamento": "...",
      "sconto_pagamento_percentuale": 0,
      "sconto_merce": 0,
      "imponibile_totale": 0,
      "note": "...",
      "righe": [{ "codice_prodotto", "nome_prodotto", "quantita_cartoni", "prezzo_per_cartone", "sc1/sc2/sc3", "is_omaggio", "confidence": "high|medium|low", "warning": "..." }],
      "warnings": ["prezzo diverso da listino", "..."],
      "document_type": "order|price_list|promo|note|attachment"
    }
  ]
}
```

Il prompt AI deve:
- Rilevare se un file contiene 1 o più ordini distinti (clienti diversi) e separarli.
- Distinguere tra ordine vero, listino, promo, nota commerciale (campo `document_type`).
- Assegnare un `confidence` per ogni riga e segnalare i dubbi in `warning`.
- Usare `google/gemini-2.5-pro` per immagini/PDF (precisione su prezzi/quantità).

Modelli: `google/gemini-2.5-pro` (default) per qualità; il modello legge PDF e immagini direttamente.
Per Excel: parsing client-side con `xlsx` → testo → AI.

## Fase 2 — Frontend: nuovo dialog `MultiFileImportDialog`

Sostituisce/affianca l'attuale `ImportPDFDialog`. Flusso:

1. **Step 1 — Upload**: dropzone multi-file (PDF, JPG, PNG, HEIC, XLSX, XLS). Mostra elenco file in coda con stato (in attesa, analisi, completato, errore).
2. **Step 2 — Analisi**: ogni file viene processato in parallelo (max 3 alla volta). Spinner per file. Errori isolati per file.
3. **Step 3 — Schermata file caricati**: tabella riepilogo
   ```
   File | Tipo rilevato | Cliente | Ordini rilevati | Azione
   ```
   - Azioni per file: Modifica / Dividi in più ordini / Unisci con altro / Marca come allegato / Elimina.
   - Per file con più ordini AI-rilevati: mostra "2 ordini rilevati, conferma divisione".
4. **Step 4 — Revisione ordini**: per ogni ordine, card espandibile con:
   - Selezione/auto-match cliente + azienda (searchable-select, evidenzia se non trovato).
   - Tipo pagamento, sconto, sconto merce.
   - Tabella righe: prodotto (auto-match + crea nuovo), quantità cartoni, prezzo, sc1/sc2/sc3, omaggio, totale calcolato.
   - **Badge warning** per righe a bassa confidence o prezzo diverso da listino/storico cliente.
   - Possibilità di eliminare righe, aggiungerne manualmente.
   - Stato ordine: `bozza` → `da confermare` → `confermato`.
5. **Step 5 — Salvataggio**: bottone "Salva tutti gli ordini confermati" → crea N ordini distinti via `useCreateOrdine` + `ordini_righe`.

## Fase 3 — Validazione intelligente client-side

Hook `useOrderValidation` che per ogni riga ordine:
- Confronta `prezzo_per_cartone` con `prodotti.prezzo_listino` → warning se differenza > 5%.
- Confronta con ultimo prezzo applicato a quel cliente (da `ordini_righe` storiche) → warning se diverso.
- Cerca prodotti simili per fuzzy match nome se non trovato codice.
- Segnala unità di misura ambigue (pallet vs cartoni vs pezzi).

## Fase 4 — UX

- Toast non bloccanti per ogni file processato.
- Bottone "Carica file" prominente in `src/pages/Ordini.tsx` accanto a quello esistente.
- Mobile-friendly: card stack invece di tabella su viewport < 768px.
- Nessun salvataggio automatico: solo bottone esplicito "Conferma e salva".

---

## File da creare/modificare

**Nuovi:**
- `supabase/functions/parse-order-multi/index.ts` — edge function unificata
- `src/components/ordini/MultiFileImportDialog.tsx` — wizard multi-step
- `src/components/ordini/OrderReviewCard.tsx` — card revisione singolo ordine
- `src/hooks/useOrderValidation.tsx` — validazioni intelligenti

**Modificati:**
- `src/pages/Ordini.tsx` — aggiunge bottone "Importa file"
- `supabase/config.toml` — registra nuova function con `verify_jwt = false`

---

## Note tecniche
- File grandi: limitare a 10MB per file, max 10 file per sessione.
- HEIC: convertire client-side o segnalare unsupported.
- Excel: estrarre testo con `xlsx` e inviarlo come testo all'AI.
- Stato wizard tenuto in memoria (no persistenza DB fino a salvataggio).
