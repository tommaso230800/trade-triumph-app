
CREATE TABLE public.riconciliazioni_allocazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  estratto_riga_id UUID NOT NULL REFERENCES public.estratti_provvigioni_righe(id) ON DELETE CASCADE,
  ordine_id UUID NOT NULL REFERENCES public.ordini(id) ON DELETE CASCADE,
  quota_imponibile NUMERIC NOT NULL DEFAULT 0,
  quota_provvigione NUMERIC NOT NULL DEFAULT 0,
  percentuale NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'intero',
  confidence NUMERIC NOT NULL DEFAULT 0,
  manuale BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT riconciliazioni_allocazioni_tipo_chk CHECK (
    tipo IN ('intero','parziale','acconto','saldo','abbuono','bonus','rettifica')
  ),
  CONSTRAINT riconciliazioni_allocazioni_unique_pair UNIQUE (estratto_riga_id, ordine_id)
);

CREATE INDEX idx_ric_alloc_user ON public.riconciliazioni_allocazioni(user_id);
CREATE INDEX idx_ric_alloc_estratto ON public.riconciliazioni_allocazioni(estratto_riga_id);
CREATE INDEX idx_ric_alloc_ordine ON public.riconciliazioni_allocazioni(ordine_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.riconciliazioni_allocazioni TO authenticated;
GRANT ALL ON public.riconciliazioni_allocazioni TO service_role;

ALTER TABLE public.riconciliazioni_allocazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own allocazioni"
ON public.riconciliazioni_allocazioni
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ric_alloc_updated
BEFORE UPDATE ON public.riconciliazioni_allocazioni
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
