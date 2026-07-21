
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS verificato_conferma BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificato_conferma_at TIMESTAMPTZ;

CREATE TABLE public.ordini_conferme (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordine_id UUID NOT NULL REFERENCES public.ordini(id) ON DELETE CASCADE,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  nome_sorgente TEXT,
  esito JSONB NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  righe_ok INTEGER NOT NULL DEFAULT 0,
  righe_diff INTEGER NOT NULL DEFAULT 0,
  righe_mancanti INTEGER NOT NULL DEFAULT 0,
  righe_extra INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  verificato_manualmente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordini_conferme_ordine ON public.ordini_conferme(ordine_id);
CREATE INDEX idx_ordini_conferme_user ON public.ordini_conferme(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordini_conferme TO authenticated;
GRANT ALL ON public.ordini_conferme TO service_role;

ALTER TABLE public.ordini_conferme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ordini_conferme"
  ON public.ordini_conferme FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ordini_conferme_updated_at
  BEFORE UPDATE ON public.ordini_conferme
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
