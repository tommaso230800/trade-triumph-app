-- Add default discount columns to aziende table
ALTER TABLE public.aziende 
ADD COLUMN IF NOT EXISTS default_sc1 numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_sc2 numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_sc3 numeric NOT NULL DEFAULT 0;