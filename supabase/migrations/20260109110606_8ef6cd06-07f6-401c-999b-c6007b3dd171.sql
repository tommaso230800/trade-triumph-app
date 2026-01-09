-- Add commission percentage column to aziende table
ALTER TABLE public.aziende 
ADD COLUMN provvigione_percentuale numeric DEFAULT 0;