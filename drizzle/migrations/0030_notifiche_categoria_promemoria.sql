-- Categoria "promemoria" ammessa nelle notifiche e nelle preferenze.
-- Errore osservato in Diagnostica: violates check constraint "notifiche_categoria_check"
-- (funzione promemoria-alerts). Le categorie esistenti restano invariate. Idempotente.
ALTER TABLE public.notifiche DROP CONSTRAINT IF EXISTS notifiche_categoria_check;
ALTER TABLE public.notifiche ADD CONSTRAINT notifiche_categoria_check
  CHECK (categoria IN ('nuovo_ordine','ordine_inviato','riordino','test','promemoria'));

ALTER TABLE public.notifiche_preferenze DROP CONSTRAINT IF EXISTS notifiche_preferenze_categoria_check;
ALTER TABLE public.notifiche_preferenze ADD CONSTRAINT notifiche_preferenze_categoria_check
  CHECK (categoria IN ('nuovo_ordine','ordine_inviato','riordino','promemoria'));
