-- Add discount columns to ordini_righe table
ALTER TABLE public.ordini_righe 
ADD COLUMN sc1 numeric NOT NULL DEFAULT 0,
ADD COLUMN sc2 numeric NOT NULL DEFAULT 0,
ADD COLUMN sc3 numeric NOT NULL DEFAULT 0;