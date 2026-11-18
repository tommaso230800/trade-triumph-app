-- ============================================================================
-- Righe di riepilogo contabile finite nel catalogo prodotti
-- ("Imponibile IVA", "Imponibile Premi", "Imponibile Provvi…", "Totale", …)
--
-- DA ESEGUIRE A MANO, UN PASSO ALLA VOLTA, leggendo i risultati.
-- Non è una migrazione automatica. Nessuna cancellazione fisica: al massimo
-- spostamento nel cestino (deleted_at), reversibile.
-- ============================================================================

-- PASSO 1 — SOLA LETTURA: elenco candidati con origine e collegamenti.
-- Controlla nome, codice, prezzo, data di creazione, chi l'ha creato e
-- soprattutto "righe_ordine": se > 0 il prodotto è usato in ordini storici.
SELECT p.id, a.nome AS azienda, p.nome, p.codice, p.prezzo_listino, p.pezzi_per_cartone,
       p.created_at, p.user_id,
       (SELECT count(*) FROM public.ordini_righe r WHERE r.prodotto_id = p.id) AS righe_ordine,
       (SELECT count(*) FROM public.product_import_rows i
         WHERE i.azienda_id = p.azienda_id AND i.data->>'nome' = p.nome) AS presenti_in_import_listino
FROM public.prodotti p
JOIN public.aziende a ON a.id = p.azienda_id
WHERE p.deleted_at IS NULL
  AND (p.codice IS NULL OR btrim(p.codice) = '')
  AND p.nome ~* '^\s*(imponibil[ei]|totale|tot\.|sub\s*-?\s*totale|iva\M|imposta|aliquota|abbuono|arrotondament|spese\M|contributo\M|netto a pagare|da pagare|provvigion|premi\M|enasarco|ritenuta|bollo|riepilogo)'
ORDER BY a.nome, p.nome, p.created_at;
-- Lettura del risultato:
--  - presenti_in_import_listino > 0  → arrivati da "Importa listino PDF".
--  - altrimenti, se creati vicino alla data di un ordine importato → da "Importa ordine"
--    (righe non associate con "Nuovo prodotto" spuntato).

-- PASSO 1b — SOLA LETTURA: per i candidati usati in ordini, quali ordini e importi.
SELECT p.nome, o.codice, o.data_ordine, o.totale, r.quantita_cartoni, r.prezzo_unitario
FROM public.prodotti p
JOIN public.ordini_righe r ON r.prodotto_id = p.id
JOIN public.ordini o ON o.id = r.ordine_id
WHERE p.deleted_at IS NULL
  AND (p.codice IS NULL OR btrim(p.codice) = '')
  AND p.nome ~* '^\s*(imponibil[ei]|totale|provvigion|premi\M|iva\M)'
ORDER BY o.data_ordine;
-- Questi NON vanno toccati da questo script: vanno controllati ordine per ordine.

-- PASSO 2 — BACKUP (prima di qualsiasi modifica).
CREATE TABLE IF NOT EXISTS public.backup_prodotti_riepilogo_20261119 AS
SELECT p.*, now() AS backup_at
FROM public.prodotti p
WHERE p.deleted_at IS NULL
  AND (p.codice IS NULL OR btrim(p.codice) = '')
  AND p.nome ~* '^\s*(imponibil[ei]|totale|tot\.|sub\s*-?\s*totale|iva\M|imposta|aliquota|abbuono|arrotondament|spese\M|contributo\M|netto a pagare|da pagare|provvigion|premi\M|enasarco|ritenuta|bollo|riepilogo)';
ALTER TABLE public.backup_prodotti_riepilogo_20261119 ENABLE ROW LEVEL SECURITY;
SELECT count(*) AS salvati FROM public.backup_prodotti_riepilogo_20261119;

-- PASSO 3 — ARCHIVIAZIONE (solo dopo aver controllato i passi 1 e 2).
-- Sposta nel cestino SOLO gli id scelti a mano dal passo 1 e SOLO se non usati
-- in ordini. Sostituisci l'elenco di id; non usare filtri sul solo nome.
-- UPDATE public.prodotti p
--    SET deleted_at = now()
--  WHERE p.id IN ('00000000-0000-0000-0000-000000000000' /* , 'id2', ... */)
--    AND p.deleted_at IS NULL
--    AND NOT EXISTS (SELECT 1 FROM public.ordini_righe r WHERE r.prodotto_id = p.id);

-- RIPRISTINO (se serve): riporta in catalogo i prodotti archiviati dal passo 3.
-- UPDATE public.prodotti p SET deleted_at = NULL
--  WHERE p.id IN (SELECT id FROM public.backup_prodotti_riepilogo_20261119);
