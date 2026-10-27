CREATE TABLE public.azienda_order_email_settings (
 azienda_id uuid PRIMARY KEY REFERENCES public.aziende(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 to_addresses text[] NOT NULL DEFAULT '{}', cc_addresses text[] NOT NULL DEFAULT '{}',
 subject_template text NOT NULL DEFAULT 'Ordine {nome_cliente} – {data_del_giorno}',
 body_template text NOT NULL DEFAULT '{saluto},

in allegato ordine.

Attendo conferma ordine.

{chiusura}.

{firma}',
 signature text NOT NULL DEFAULT '', sender_name text NOT NULL DEFAULT '', reply_to text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.azienda_order_email_settings TO authenticated;
GRANT ALL ON public.azienda_order_email_settings TO service_role;
ALTER TABLE public.azienda_order_email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own company email settings" ON public.azienda_order_email_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.aziende a WHERE a.id=azienda_id AND a.user_id=auth.uid()));
CREATE POLICY "Insert own company email settings" ON public.azienda_order_email_settings FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.aziende a WHERE a.id=azienda_id AND a.user_id=auth.uid()));
CREATE POLICY "Update own company email settings" ON public.azienda_order_email_settings FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.aziende a WHERE a.id=azienda_id AND a.user_id=auth.uid()));
CREATE TABLE public.order_email_sends (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, ordine_id uuid NOT NULL REFERENCES public.ordini(id),
 created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
 to_addresses text[] NOT NULL, cc_addresses text[] NOT NULL DEFAULT '{}',
 subject text NOT NULL, body text NOT NULL, sender_name text NOT NULL DEFAULT '', reply_to text NOT NULL DEFAULT '',
 pdf_path text NOT NULL, pdf_filename text NOT NULL, order_version text NOT NULL,
 status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','error')),
 provider_message_id text, error_message text
);
GRANT SELECT ON public.order_email_sends TO authenticated;
GRANT ALL ON public.order_email_sends TO service_role;
ALTER TABLE public.order_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own order email history" ON public.order_email_sends FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE INDEX order_email_sends_order_date ON public.order_email_sends (ordine_id, created_at DESC);