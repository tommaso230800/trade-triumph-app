-- Agente email ordini: log/audit di ogni email processata dalle 2 caselle.
-- UNIQUE(mailbox, message_id) garantisce che la stessa email non venga mai
-- rielaborata due volte, anche se il cron gira più volte sulla stessa finestra.
CREATE TYPE public.email_import_stato AS ENUM (
  'ricevuta','allegato_estratto','classificata',
  'in_revisione','ambiguo_scegli_ordine',
  'confermata','scartata','errore',
  'ignorata_no_allegato','ignorata_duplicato'
);

CREATE TYPE public.email_import_caso AS ENUM ('A','B');

CREATE TABLE public.email_import_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox TEXT NOT NULL,
  message_id TEXT NOT NULL,
  imap_uid INTEGER,
  oggetto TEXT,
  mittente TEXT,
  data_ricezione TIMESTAMPTZ,
  stato public.email_import_stato NOT NULL DEFAULT 'ricevuta',
  caso public.email_import_caso,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  ordine_id UUID REFERENCES public.ordini(id) ON DELETE SET NULL,
  ordini_conferme_id UUID REFERENCES public.ordini_conferme(id) ON DELETE SET NULL,
  dati_estratti JSONB,
  candidati_ordine_ids UUID[],
  errore_messaggio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mailbox, message_id)
);

CREATE INDEX idx_email_import_log_user ON public.email_import_log(user_id);
CREATE INDEX idx_email_import_log_stato ON public.email_import_log(user_id, stato);
CREATE INDEX idx_email_import_log_mailbox_uid ON public.email_import_log(mailbox, imap_uid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_import_log TO authenticated;
GRANT ALL ON public.email_import_log TO service_role;

ALTER TABLE public.email_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email_import_log"
  ON public.email_import_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access"
  ON public.email_import_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_email_import_log_updated_at
  BEFORE UPDATE ON public.email_import_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
