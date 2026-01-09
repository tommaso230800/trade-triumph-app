-- Add palletization fields to prodotti table
ALTER TABLE public.prodotti 
ADD COLUMN IF NOT EXISTS strati integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS cartoni_per_strato integer NOT NULL DEFAULT 1;

-- Add partita_iva to aziende table
ALTER TABLE public.aziende 
ADD COLUMN IF NOT EXISTS partita_iva text;

-- Add partita_iva to clienti table
ALTER TABLE public.clienti 
ADD COLUMN IF NOT EXISTS partita_iva text;