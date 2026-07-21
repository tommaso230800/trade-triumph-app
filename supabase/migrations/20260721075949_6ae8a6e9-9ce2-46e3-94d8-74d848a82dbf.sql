-- FASE 5: Ruoli e sicurezza
-- Enum ruoli
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','agente','collaboratore','amministrazione','brand_ambassador','readonly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabella user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','amministrazione')
  )
$$;

-- Policies user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger: primo utente = admin, altri = agente
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.user_roles;
  IF v_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agente');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Backfill: assegna admin al primo utente esistente, agente agli altri
INSERT INTO public.user_roles (user_id, role)
SELECT id,
  CASE WHEN row_number() OVER (ORDER BY created_at) = 1 THEN 'admin'::public.app_role
       ELSE 'agente'::public.app_role END
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Aggiungi policy admin-bypass su tabelle sensibili (senza rimuovere esistenti)
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'ordini','clienti','prodotti','aziende','provvigioni_condizioni','provvigioni_premi',
  'estratti_provvigioni','estratti_provvigioni_righe','scadenziario_fatture',
  'movimenti_provvigione','documenti','segnalazioni','segnalazioni_eventi',
  'omaggi_erogati','contratti_clienti','promo_clienti','ordini_righe','ordini_conferme',
  'clienti_alias','riconciliazioni_allocazioni','riconciliazioni_pagamenti',
  'ai_attivita','ai_promemoria','ai_activity_log'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Admins full access" ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
      t
    );
  END LOOP;
END $$;