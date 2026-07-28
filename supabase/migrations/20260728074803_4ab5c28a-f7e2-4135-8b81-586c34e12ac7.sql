-- Agente email ordini: staging Caso B (ordine da collega via email).
--
-- IMPORTANTE: questa tabella è deliberatamente separata da public.ordini.
-- Nessuna query di KPI/provvigioni/fatturato in questo progetto legge da
-- ordini_import_proposte (verificato: useKPIYoY, useAdvancedKPIStats,
-- useClientKPI, useStats, useProvvigioniAnalytics, useReorderForecast,
-- useOmaggiAutomatici, useClientCommercialData, useClientProductHistory,
-- useConsegne, useClienteAziendaAnalysis, metricsEngine.ts interrogano
-- tutte esclusivamente public.ordini). Una riga qui diventa un ordine reale
-- SOLO quando l'utente clicca "Conferma" e l'app chiama gli hook esistenti
-- useCreateOrdine + useCreateOrdineRigheBatch, invariati.
CREATE TYPE public.ordine_proposta_stato AS ENUM ('in_revisione','confermato','scartato');

CREATE TABLE public.ordini_import_proposte (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_import_log_id UUID REFERENCES public.email_import_log(id) ON DELETE SET NULL,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  stato public.ordine_proposta_stato NOT NULL DEFAULT 'in_revisione',
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  cliente_nome_estratto TEXT,
  dati_estratti JSONB NOT NULL,
  note_matching JSONB,
  ordine_id_creato UUID REFERENCES public.ordini(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordini_import_proposte_user ON public.ordini_import_proposte(user_id);
CREATE INDEX idx_ordini_import_proposte_stato ON public.ordini_import_proposte(user_id, stato);
CREATE INDEX idx_ordini_import_proposte_cliente ON public.ordini_import_proposte(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_ordini_import_proposte_azienda ON public.ordini_import_proposte(azienda_id) WHERE azienda_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordini_import_proposte TO authenticated;
GRANT ALL ON public.ordini_import_proposte TO service_role;

ALTER TABLE public.ordini_import_proposte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ordini_import_proposte"
  ON public.ordini_import_proposte FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access"
  ON public.ordini_import_proposte FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_ordini_import_proposte_updated_at
  BEFORE UPDATE ON public.ordini_import_proposte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
