-- Tabella per i giri visita (giornata di visite pianificate)
CREATE TABLE public.giri_visita (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  nome TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per le singole visite nel giro
CREATE TABLE public.visite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  giro_id UUID NOT NULL REFERENCES public.giri_visita(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  ordine_visita INTEGER NOT NULL DEFAULT 0,
  orario_previsto TIME,
  orario_effettivo TIME,
  esito TEXT CHECK (esito IN ('completata', 'ordine', 'no_interesse', 'ripassare', 'assente', NULL)),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.giri_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visite ENABLE ROW LEVEL SECURITY;

-- RLS policies for giri_visita
CREATE POLICY "Users can view own giri_visita" ON public.giri_visita FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own giri_visita" ON public.giri_visita FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own giri_visita" ON public.giri_visita FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own giri_visita" ON public.giri_visita FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for visite
CREATE POLICY "Users can view own visite" ON public.visite FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own visite" ON public.visite FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own visite" ON public.visite FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own visite" ON public.visite FOR DELETE USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE TRIGGER update_giri_visita_updated_at
BEFORE UPDATE ON public.giri_visita
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visite_updated_at
BEFORE UPDATE ON public.visite
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();