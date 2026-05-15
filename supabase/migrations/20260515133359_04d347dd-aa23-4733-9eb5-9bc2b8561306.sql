
-- Estensione tabella clienti
ALTER TABLE public.clienti
  ADD COLUMN IF NOT EXISTS livello_relazione integer,
  ADD COLUMN IF NOT EXISTS potenziale_cliente text;

-- Tabella competitor_products
CREATE TABLE public.competitor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  categoria text,
  nome text NOT NULL,
  marca text,
  formato text,
  prezzo_acquisto numeric DEFAULT 0,
  prezzo_vendita numeric DEFAULT 0,
  margine_stimato numeric DEFAULT 0,
  sconto numeric DEFAULT 0,
  omaggi text,
  condizioni text,
  pagamento text,
  frequenza text,
  quantita_abituale text,
  agente_concorrente text,
  soddisfazione integer,
  punti_forti text,
  punti_deboli text,
  nostro_prodotto_id uuid,
  nostro_prezzo numeric,
  vantaggio text,
  priorita text DEFAULT 'media',
  stato text DEFAULT 'da_monitorare',
  foto_url text,
  note text,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own competitor_products" ON public.competitor_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own competitor_products" ON public.competitor_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own competitor_products" ON public.competitor_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own competitor_products" ON public.competitor_products FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_competitor_products_cliente ON public.competitor_products(cliente_id);
CREATE TRIGGER trg_competitor_products_updated BEFORE UPDATE ON public.competitor_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabella visit_preparations
CREATE TABLE public.visit_preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  visit_date date,
  status text NOT NULL DEFAULT 'preparata',
  riepilogo_cliente text,
  storico_commerciale text,
  analisi_concorrenza text,
  obiettivo_visita text,
  proposta_consigliata text,
  argomenti_vendita text,
  obiezioni_previste text,
  domande_consigliate text,
  prossima_azione text,
  contenuto_completo jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_preparations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own visit_preparations" ON public.visit_preparations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own visit_preparations" ON public.visit_preparations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own visit_preparations" ON public.visit_preparations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own visit_preparations" ON public.visit_preparations FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_visit_preparations_cliente ON public.visit_preparations(cliente_id);
CREATE TRIGGER trg_visit_preparations_updated BEFORE UPDATE ON public.visit_preparations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabella visit_reports
CREATE TABLE public.visit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  visit_preparation_id uuid REFERENCES public.visit_preparations(id) ON DELETE SET NULL,
  data_visita date NOT NULL DEFAULT CURRENT_DATE,
  esito text,
  ordine_preso boolean DEFAULT false,
  valore_ordine numeric DEFAULT 0,
  prodotti_ordinati jsonb DEFAULT '[]'::jsonb,
  prodotti_proposti jsonb DEFAULT '[]'::jsonb,
  prodotti_proposti_non_ordinati jsonb DEFAULT '[]'::jsonb,
  concorrenza_rilevata jsonb DEFAULT '[]'::jsonb,
  obiezioni text,
  risposte_date text,
  interesse_cliente text,
  umore_cliente text,
  promozioni_discusse text,
  campioni_lasciati text,
  espositori_richiesti text,
  materiale_promozionale text,
  prossima_azione text,
  data_follow_up date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own visit_reports" ON public.visit_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own visit_reports" ON public.visit_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own visit_reports" ON public.visit_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own visit_reports" ON public.visit_reports FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_visit_reports_cliente ON public.visit_reports(cliente_id);
CREATE INDEX idx_visit_reports_prep ON public.visit_reports(visit_preparation_id);
CREATE TRIGGER trg_visit_reports_updated BEFORE UPDATE ON public.visit_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
