
-- Tabella deals (trattative/negoziazioni)
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  goal TEXT,
  estimated_value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  next_action_date DATE,
  next_action_note TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabella deal_messages (messaggi generati dall'assistente)
CREATE TABLE public.deal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'call_script')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for deal_messages
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deal_messages" ON public.deal_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deal_messages" ON public.deal_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deal_messages" ON public.deal_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deal_messages" ON public.deal_messages FOR DELETE USING (auth.uid() = user_id);

-- Tabella client_notes (obiezioni, preferenze, info importanti)
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('payment', 'objections', 'preferences', 'general')),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for client_notes
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client_notes" ON public.client_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own client_notes" ON public.client_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own client_notes" ON public.client_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own client_notes" ON public.client_notes FOR DELETE USING (auth.uid() = user_id);
