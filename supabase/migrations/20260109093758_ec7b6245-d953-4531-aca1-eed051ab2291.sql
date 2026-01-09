
-- Create products table linked to companies
CREATE TABLE public.prodotti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  prezzo_listino NUMERIC NOT NULL DEFAULT 0,
  quantita_pezzi INTEGER NOT NULL DEFAULT 0,
  pezzi_per_cartone INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.ordini_righe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordine_id UUID NOT NULL REFERENCES public.ordini(id) ON DELETE CASCADE,
  prodotto_id UUID NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantita_pezzi INTEGER NOT NULL DEFAULT 0,
  quantita_cartoni INTEGER NOT NULL DEFAULT 0,
  prezzo_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prodotti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordini_righe ENABLE ROW LEVEL SECURITY;

-- RLS policies for prodotti
CREATE POLICY "Users can view own prodotti" ON public.prodotti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prodotti" ON public.prodotti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prodotti" ON public.prodotti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prodotti" ON public.prodotti FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for ordini_righe
CREATE POLICY "Users can view own ordini_righe" ON public.ordini_righe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ordini_righe" ON public.ordini_righe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ordini_righe" ON public.ordini_righe FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ordini_righe" ON public.ordini_righe FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_prodotti_updated_at
BEFORE UPDATE ON public.prodotti
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
