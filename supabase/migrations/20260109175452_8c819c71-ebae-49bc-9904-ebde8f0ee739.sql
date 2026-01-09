-- Aggiungo supporto contratti per consorzi
ALTER TABLE public.contratti_clienti 
ADD COLUMN consorzio TEXT,
ADD COLUMN is_consorzio BOOLEAN NOT NULL DEFAULT false;

-- Rimuovo il constraint unique esistente e ne creo uno nuovo che considera anche consorzio
ALTER TABLE public.contratti_clienti DROP CONSTRAINT IF EXISTS contratti_clienti_cliente_id_azienda_id_anno_key;

-- Nuovo constraint che permette contratti per cliente O per consorzio
ALTER TABLE public.contratti_clienti 
ADD CONSTRAINT contratti_clienti_unique_check 
UNIQUE NULLS NOT DISTINCT (cliente_id, azienda_id, anno, consorzio);

-- Aggiungo campo per cartoni omaggio nelle promozioni
ALTER TABLE public.canvass 
ADD COLUMN cartoni_omaggio INTEGER DEFAULT 0,
ADD COLUMN cartoni_acquisto INTEGER DEFAULT 0;