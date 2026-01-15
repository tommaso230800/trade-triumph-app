
-- Create daily_reports table
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_report DATE NOT NULL DEFAULT CURRENT_DATE,
  titolo TEXT NOT NULL,
  testo_report TEXT,
  ordini_fatti BOOLEAN DEFAULT FALSE,
  campioni_consegnati BOOLEAN DEFAULT FALSE,
  promo_proposte BOOLEAN DEFAULT FALSE,
  problemi BOOLEAN DEFAULT FALSE,
  incassi BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_activities table
CREATE TABLE public.report_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  tipo_attivita TEXT NOT NULL,
  descrizione TEXT,
  esito TEXT,
  prossimo_step TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_clients junction table
CREATE TABLE public.report_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, cliente_id)
);

-- Create report_orders junction table
CREATE TABLE public.report_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  ordine_id UUID NOT NULL REFERENCES public.ordini(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, ordine_id)
);

-- Enable RLS on all tables
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_reports
CREATE POLICY "Users can view own daily_reports" ON public.daily_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_reports" ON public.daily_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_reports" ON public.daily_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily_reports" ON public.daily_reports FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for report_activities
CREATE POLICY "Users can view own report_activities" ON public.report_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own report_activities" ON public.report_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own report_activities" ON public.report_activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own report_activities" ON public.report_activities FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for report_clients
CREATE POLICY "Users can view own report_clients" ON public.report_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own report_clients" ON public.report_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own report_clients" ON public.report_clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own report_clients" ON public.report_clients FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for report_orders
CREATE POLICY "Users can view own report_orders" ON public.report_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own report_orders" ON public.report_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own report_orders" ON public.report_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own report_orders" ON public.report_orders FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on daily_reports
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
