-- Funzione per aggiornare il fatturato e ordini_count del cliente
CREATE OR REPLACE FUNCTION public.update_cliente_stats()
RETURNS TRIGGER AS $$
DECLARE
  old_cliente_id uuid;
  new_cliente_id uuid;
BEGIN
  -- Determina i cliente_id coinvolti
  IF TG_OP = 'DELETE' THEN
    old_cliente_id := OLD.cliente_id;
    new_cliente_id := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_cliente_id := NULL;
    new_cliente_id := NEW.cliente_id;
  ELSE -- UPDATE
    old_cliente_id := OLD.cliente_id;
    new_cliente_id := NEW.cliente_id;
  END IF;

  -- Aggiorna il vecchio cliente se esiste
  IF old_cliente_id IS NOT NULL THEN
    UPDATE public.clienti
    SET 
      fatturato = COALESCE((
        SELECT SUM(totale) 
        FROM public.ordini 
        WHERE cliente_id = old_cliente_id AND status != 'annullato'
      ), 0),
      ordini_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.ordini 
        WHERE cliente_id = old_cliente_id AND status != 'annullato'
      ), 0)
    WHERE id = old_cliente_id;
  END IF;

  -- Aggiorna il nuovo cliente se esiste e diverso dal vecchio
  IF new_cliente_id IS NOT NULL AND (old_cliente_id IS NULL OR new_cliente_id != old_cliente_id) THEN
    UPDATE public.clienti
    SET 
      fatturato = COALESCE((
        SELECT SUM(totale) 
        FROM public.ordini 
        WHERE cliente_id = new_cliente_id AND status != 'annullato'
      ), 0),
      ordini_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.ordini 
        WHERE cliente_id = new_cliente_id AND status != 'annullato'
      ), 0)
    WHERE id = new_cliente_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crea il trigger sugli ordini
DROP TRIGGER IF EXISTS trigger_update_cliente_stats ON public.ordini;
CREATE TRIGGER trigger_update_cliente_stats
AFTER INSERT OR UPDATE OR DELETE ON public.ordini
FOR EACH ROW
EXECUTE FUNCTION public.update_cliente_stats();

-- Aggiorna tutti i fatturati esistenti
UPDATE public.clienti c
SET 
  fatturato = COALESCE((
    SELECT SUM(totale) 
    FROM public.ordini o 
    WHERE o.cliente_id = c.id AND o.status != 'annullato'
  ), 0),
  ordini_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.ordini o 
    WHERE o.cliente_id = c.id AND o.status != 'annullato'
  ), 0);