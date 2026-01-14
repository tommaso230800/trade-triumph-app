-- Create price_increases table for tracking price increases
CREATE TABLE public.price_increases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  effective_date DATE NOT NULL,
  company_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.prodotti(id) ON DELETE SET NULL,
  category TEXT,
  increase_type TEXT NOT NULL CHECK (increase_type IN ('percent', 'fixed')),
  increase_value NUMERIC NOT NULL,
  reason TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.price_increases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own price_increases" ON public.price_increases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own price_increases" ON public.price_increases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own price_increases" ON public.price_increases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own price_increases" ON public.price_increases FOR DELETE USING (auth.uid() = user_id);

-- Create increase_actions table for tracking client-specific increase management
CREATE TABLE public.increase_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  price_increase_id UUID NOT NULL REFERENCES public.price_increases(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'contacted', 'agreed', 'refused')),
  planned_contact_date DATE,
  outcome_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.increase_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own increase_actions" ON public.increase_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own increase_actions" ON public.increase_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own increase_actions" ON public.increase_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own increase_actions" ON public.increase_actions FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_increase_actions_updated_at
BEFORE UPDATE ON public.increase_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();