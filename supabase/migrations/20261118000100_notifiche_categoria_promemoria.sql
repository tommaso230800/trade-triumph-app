-- Ammette la categoria "promemoria" nei vincoli sulle categorie di notifica.
-- Errore osservato: new row for relation "notifiche" violates check constraint
-- "notifiche_categoria_check" (funzione promemoria-alerts).
--
-- Il vincolo esistente non è nel repository: invece di riscriverlo a mano
-- (rischiando di perdere categorie), si legge la definizione attuale e si
-- aggiunge solo 'promemoria' all'elenco ammesso. Vale per ogni vincolo CHECK
-- sulle categorie di notifica (notifiche, notifiche_preferenze, …).
-- Nessun dato viene modificato; RLS invariata.

DO $$
DECLARE
  c record;
  def text;
  nuova text;
BEGIN
  FOR c IN
    SELECT con.conname, rel.relname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%categoria%'
      AND pg_get_constraintdef(con.oid) ILIKE '%riordino%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%promemoria%'
  LOOP
    def := c.def;
    IF def ILIKE '%ARRAY[%' THEN
      -- CHECK ((categoria = ANY (ARRAY['a'::text, ...])))
      nuova := regexp_replace(def, 'ARRAY\[', 'ARRAY[''promemoria''::text, ', 'i');
    ELSIF def ~* 'IN \(' THEN
      nuova := regexp_replace(def, 'IN \(', 'IN (''promemoria'', ', 'i');
    ELSE
      RAISE NOTICE 'Vincolo % su % non riconosciuto, lasciato invariato: %', c.conname, c.relname, def;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', c.relname, c.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', c.relname, c.conname, nuova);
    RAISE NOTICE 'Vincolo % su % aggiornato: %', c.conname, c.relname, nuova;
  END LOOP;
END $$;
