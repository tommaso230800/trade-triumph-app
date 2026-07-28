-- Agente email ordini: traccia la provenienza di un confronto conferma
-- (manuale vs automatico da email). Additivo: il default 'manuale' preserva
-- il significato di tutte le righe già esistenti e create dal flusso attuale
-- (VerificaConfermaDialog / useSaveOrdineConferma), invariato.
ALTER TABLE public.ordini_conferme
  ADD COLUMN IF NOT EXISTS fonte TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('manuale','email')),
  ADD COLUMN IF NOT EXISTS email_import_log_id UUID REFERENCES public.email_import_log(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordini_conferme_fonte
  ON public.ordini_conferme(user_id, fonte, verificato_manualmente);
