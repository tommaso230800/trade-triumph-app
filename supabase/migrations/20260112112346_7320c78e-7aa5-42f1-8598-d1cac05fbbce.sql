-- Aggiungi formato e sconti default ai prodotti
ALTER TABLE public.prodotti 
ADD COLUMN IF NOT EXISTS formato text,
ADD COLUMN IF NOT EXISTS sc1_default numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sc2_default numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sc3_default numeric NOT NULL DEFAULT 0;