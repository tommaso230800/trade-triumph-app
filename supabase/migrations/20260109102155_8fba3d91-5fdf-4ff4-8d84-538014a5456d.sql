-- Add new columns to clienti for additional contact and billing info
ALTER TABLE public.clienti 
ADD COLUMN IF NOT EXISTS indirizzo text,
ADD COLUMN IF NOT EXISTS cap text,
ADD COLUMN IF NOT EXISTS citta text,
ADD COLUMN IF NOT EXISTS provincia text,
ADD COLUMN IF NOT EXISTS codice_sdi text,
ADD COLUMN IF NOT EXISTS pec text,
ADD COLUMN IF NOT EXISTS email_aggiuntive text[],
ADD COLUMN IF NOT EXISTS consorzio text;