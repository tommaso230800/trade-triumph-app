
CREATE TABLE public.contratti_obbiettivi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contratto_id UUID NOT NULL REFERENCES public.contratti_clienti(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'condizionato',
  percentuale_premio NUMERIC NOT NULL DEFAULT 0,
  soglia_fatturato NUMERIC DEFAULT 0,
  descrizione TEXT,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratti_obbiettivi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contratti_obbiettivi" ON public.contratti_obbiettivi FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contratti_obbiettivi" ON public.contratti_obbiettivi FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contratti_obbiettivi" ON public.contratti_obbiettivi FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contratti_obbiettivi" ON public.contratti_obbiettivi FOR DELETE USING (auth.uid() = user_id);
