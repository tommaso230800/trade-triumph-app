-- Campi OneDrive su documenti
ALTER TABLE public.documenti
  ADD COLUMN IF NOT EXISTS onedrive_item_id text,
  ADD COLUMN IF NOT EXISTS onedrive_drive_id text,
  ADD COLUMN IF NOT EXISTS onedrive_web_url text,
  ADD COLUMN IF NOT EXISTS onedrive_etag text,
  ADD COLUMN IF NOT EXISTS onedrive_modified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_stato text NOT NULL DEFAULT 'locale',
  ADD COLUMN IF NOT EXISTS sync_origine text;

CREATE INDEX IF NOT EXISTS documenti_onedrive_item_idx ON public.documenti (onedrive_item_id) WHERE onedrive_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documenti_hash_idx ON public.documenti (hash_sha256) WHERE hash_sha256 IS NOT NULL;

-- Stato connessione/sincronizzazione OneDrive (una riga per utente)
CREATE TABLE IF NOT EXISTS public.onedrive_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drive_id text,
  drive_name text,
  account_email text,
  root_folder_id text,
  root_folder_path text,
  delta_token text,
  ultima_sync_at timestamptz,
  ultimo_esito text,
  stato text NOT NULL DEFAULT 'attiva',
  documenti_sincronizzati integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onedrive_sync_state TO authenticated;
GRANT ALL ON public.onedrive_sync_state TO service_role;
ALTER TABLE public.onedrive_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY onedrive_sync_state_owner ON public.onedrive_sync_state
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Registro eventi di sincronizzazione
CREATE TABLE IF NOT EXISTS public.onedrive_sync_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  documento_id uuid REFERENCES public.documenti(id) ON DELETE SET NULL,
  origine text NOT NULL DEFAULT 'onedrive',
  tipo_evento text NOT NULL,
  stato text NOT NULL DEFAULT 'completato',
  tentativi integer NOT NULL DEFAULT 0,
  errore text,
  dettagli jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onedrive_sync_eventi TO authenticated;
GRANT ALL ON public.onedrive_sync_eventi TO service_role;
ALTER TABLE public.onedrive_sync_eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY onedrive_sync_eventi_owner ON public.onedrive_sync_eventi
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS onedrive_sync_eventi_user_idx ON public.onedrive_sync_eventi (user_id, created_at DESC);