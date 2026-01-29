-- Aggiungi campo fatturato_2025 per storicizzare il fatturato dell'anno precedente
ALTER TABLE public.clienti 
ADD COLUMN fatturato_2025 numeric DEFAULT 0;