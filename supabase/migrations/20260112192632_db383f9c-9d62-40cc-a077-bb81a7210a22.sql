-- Tabella template trattativa (schemi salvati)
CREATE TABLE public.template_trattativa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipologia_cliente TEXT NOT NULL DEFAULT 'bar', -- bar, alimentari, ingrosso
  obiettivo_default TEXT NOT NULL DEFAULT 'aumentare_quantita',
  sconto_max_percentuale NUMERIC DEFAULT 10,
  omaggio_default TEXT, -- es: "10+1", "25+3"
  extra_default TEXT, -- es: "esposizione", "materiale POP"
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella storico trattative (log con esito)
CREATE TABLE public.storico_trattative (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  tipologia_cliente TEXT NOT NULL DEFAULT 'bar',
  prodotto_nome TEXT NOT NULL,
  prezzo_listino NUMERIC NOT NULL,
  costo_acquisto NUMERIC,
  margine_target NUMERIC,
  pezzi_per_cartone INTEGER NOT NULL DEFAULT 6,
  quantita_cartoni INTEGER NOT NULL DEFAULT 1,
  quantita_pezzi INTEGER NOT NULL DEFAULT 6,
  sconto_richiesto NUMERIC,
  obiettivo TEXT NOT NULL,
  carta_scelta TEXT, -- 'A', 'B', 'C' o null se non chiusa
  esito TEXT, -- 'accettata', 'rifiutata', 'in_corso'
  note TEXT,
  dati_carte JSONB, -- salva i dettagli delle 3 carte generate
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_trattativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storico_trattative ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_trattativa
CREATE POLICY "Users can view own template_trattativa"
ON public.template_trattativa FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own template_trattativa"
ON public.template_trattativa FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own template_trattativa"
ON public.template_trattativa FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own template_trattativa"
ON public.template_trattativa FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for storico_trattative
CREATE POLICY "Users can view own storico_trattative"
ON public.storico_trattative FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storico_trattative"
ON public.storico_trattative FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storico_trattative"
ON public.storico_trattative FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storico_trattative"
ON public.storico_trattative FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_template_trattativa_updated_at
BEFORE UPDATE ON public.template_trattativa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();