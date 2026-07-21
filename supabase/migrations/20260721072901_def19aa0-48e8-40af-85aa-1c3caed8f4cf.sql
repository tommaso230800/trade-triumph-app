
-- Segnalazioni (reclami + note di credito)
CREATE TABLE public.segnalazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('reclamo','nota_credito')),
  stato TEXT NOT NULL DEFAULT 'da_gestire' CHECK (stato IN ('da_gestire','in_lavorazione','richiesta','sollecitata','approvata','emessa','ricevuta','chiusa','respinta')),
  priorita TEXT NOT NULL DEFAULT 'media' CHECK (priorita IN ('bassa','media','alta','urgente')),
  oggetto TEXT NOT NULL,
  descrizione TEXT,
  causa TEXT,
  importo_richiesto NUMERIC(14,2) DEFAULT 0,
  importo_riconosciuto NUMERIC(14,2) DEFAULT 0,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  ordine_id UUID REFERENCES public.ordini(id) ON DELETE SET NULL,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  responsabile TEXT,
  scadenza DATE,
  data_apertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_risoluzione DATE,
  soluzione TEXT,
  numero_nota_credito TEXT,
  data_emissione_nc DATE,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.segnalazioni TO authenticated;
GRANT ALL ON public.segnalazioni TO service_role;
ALTER TABLE public.segnalazioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own segnalazioni" ON public.segnalazioni FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_segnalazioni_user ON public.segnalazioni(user_id);
CREATE INDEX idx_segnalazioni_stato ON public.segnalazioni(user_id, stato);
CREATE INDEX idx_segnalazioni_tipo ON public.segnalazioni(user_id, tipo);
CREATE INDEX idx_segnalazioni_ordine ON public.segnalazioni(ordine_id);
CREATE INDEX idx_segnalazioni_cliente ON public.segnalazioni(cliente_id);
CREATE INDEX idx_segnalazioni_azienda ON public.segnalazioni(azienda_id);
CREATE TRIGGER trg_segnalazioni_updated_at BEFORE UPDATE ON public.segnalazioni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Eventi / timeline
CREATE TABLE public.segnalazioni_eventi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segnalazione_id UUID NOT NULL REFERENCES public.segnalazioni(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('nota','email','telefonata','sollecito','cambio_stato','allegato','sistema')),
  descrizione TEXT,
  stato_precedente TEXT,
  stato_nuovo TEXT,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.segnalazioni_eventi TO authenticated;
GRANT ALL ON public.segnalazioni_eventi TO service_role;
ALTER TABLE public.segnalazioni_eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own segnalazioni eventi" ON public.segnalazioni_eventi FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_seg_eventi_segn ON public.segnalazioni_eventi(segnalazione_id, created_at DESC);
