-- Add order date column to ordini table
ALTER TABLE public.ordini 
ADD COLUMN data_ordine date DEFAULT CURRENT_DATE;