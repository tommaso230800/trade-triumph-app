-- Colore identità azienda, usato per rappresentare l'azienda nei dati (KPI, grafici, ordini)
-- RLS: nessuna nuova policy necessaria, la UPDATE "Users can update own aziende" già copre questa colonna

ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS colore text;

UPDATE public.aziende SET colore = '#111111' WHERE lower(trim(nome)) = lower(trim('Toser Vini')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#6b8e23' WHERE lower(trim(nome)) = lower(trim('Casoni')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#39ff14' WHERE lower(trim(nome)) = lower(trim('Ricola')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#1e3a8a' WHERE lower(trim(nome)) = lower(trim('Zuegg')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#38bdf8' WHERE lower(trim(nome)) = lower(trim('Maniva')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#f97316' WHERE lower(trim(nome)) = lower(trim('Polara')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#facc15' WHERE lower(trim(nome)) = lower(trim('C&C')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#800020' WHERE lower(trim(nome)) = lower(trim('Schenk')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#ef4444' WHERE lower(trim(nome)) = lower(trim('Cantine 4 Valli')) AND colore IS NULL;
UPDATE public.aziende SET colore = '#ec4899' WHERE lower(trim(nome)) = lower(trim('DouMix')) AND colore IS NULL;
