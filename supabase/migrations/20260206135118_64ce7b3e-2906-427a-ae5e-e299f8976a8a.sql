
ALTER TABLE public.scadenziario_fatture 
ADD COLUMN provvigione_incassata boolean NOT NULL DEFAULT false;

ALTER TABLE public.scadenziario_fatture 
ADD COLUMN data_incasso_provvigione date DEFAULT NULL;
