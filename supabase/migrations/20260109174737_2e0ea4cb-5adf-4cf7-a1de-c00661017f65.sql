-- Tabella promozioni/canvass
CREATE TABLE public.canvass (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('sconto_percentuale', 'prezzo_fisso', 'premio_fine_anno')),
  valore NUMERIC NOT NULL DEFAULT 0,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  tutti_clienti BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per associare promozioni a clienti specifici
CREATE TABLE public.canvass_clienti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  canvass_id UUID NOT NULL REFERENCES public.canvass(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(canvass_id, cliente_id)
);

-- Tabella per associare promozioni a prodotti specifici
CREATE TABLE public.canvass_prodotti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  canvass_id UUID NOT NULL REFERENCES public.canvass(id) ON DELETE CASCADE,
  prodotto_id UUID NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  valore_override NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(canvass_id, prodotto_id)
);

-- Tabella contratti clienti (premi fine anno)
CREATE TABLE public.contratti_clienti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  anno INTEGER NOT NULL,
  percentuale_premio NUMERIC NOT NULL DEFAULT 0,
  soglia_fatturato NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, azienda_id, anno)
);

-- Enable RLS
ALTER TABLE public.canvass ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvass_clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvass_prodotti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratti_clienti ENABLE ROW LEVEL SECURITY;

-- Policies per canvass
CREATE POLICY "Users can view own canvass" ON public.canvass FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvass" ON public.canvass FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvass" ON public.canvass FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvass" ON public.canvass FOR DELETE USING (auth.uid() = user_id);

-- Policies per canvass_clienti
CREATE POLICY "Users can view own canvass_clienti" ON public.canvass_clienti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvass_clienti" ON public.canvass_clienti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvass_clienti" ON public.canvass_clienti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvass_clienti" ON public.canvass_clienti FOR DELETE USING (auth.uid() = user_id);

-- Policies per canvass_prodotti
CREATE POLICY "Users can view own canvass_prodotti" ON public.canvass_prodotti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvass_prodotti" ON public.canvass_prodotti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvass_prodotti" ON public.canvass_prodotti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvass_prodotti" ON public.canvass_prodotti FOR DELETE USING (auth.uid() = user_id);

-- Policies per contratti_clienti
CREATE POLICY "Users can view own contratti_clienti" ON public.contratti_clienti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contratti_clienti" ON public.contratti_clienti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contratti_clienti" ON public.contratti_clienti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contratti_clienti" ON public.contratti_clienti FOR DELETE USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE TRIGGER update_canvass_updated_at BEFORE UPDATE ON public.canvass FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratti_clienti_updated_at BEFORE UPDATE ON public.contratti_clienti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();