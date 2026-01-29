-- Aggiungi campo obiezione_principale alla tabella clienti
ALTER TABLE public.clienti
ADD COLUMN obiezione_principale text DEFAULT NULL;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.clienti.obiezione_principale IS 'Obiezione principale del cliente nelle trattative, usata come promemoria pre-visita';