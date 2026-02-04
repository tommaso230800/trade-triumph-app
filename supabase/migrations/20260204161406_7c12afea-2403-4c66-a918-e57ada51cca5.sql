-- Create scadenziario_fatture table for client invoices management
CREATE TABLE public.scadenziario_fatture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  azienda_nome TEXT NOT NULL,
  numero_fattura TEXT NOT NULL,
  data_fattura DATE NOT NULL,
  data_scadenza DATE NOT NULL,
  importo NUMERIC NOT NULL DEFAULT 0,
  percentuale_provvigione NUMERIC NOT NULL DEFAULT 0,
  provvigione_calcolata NUMERIC NOT NULL DEFAULT 0,
  stato TEXT NOT NULL DEFAULT 'scaduta',
  data_incasso DATE,
  trimestre_provvigione TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scadenziario_fatture ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own scadenziario_fatture"
ON public.scadenziario_fatture
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scadenziario_fatture"
ON public.scadenziario_fatture
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scadenziario_fatture"
ON public.scadenziario_fatture
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scadenziario_fatture"
ON public.scadenziario_fatture
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_scadenziario_fatture_updated_at
BEFORE UPDATE ON public.scadenziario_fatture
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();