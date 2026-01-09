-- Tabella per gestire periodi multipli delle promozioni
CREATE TABLE public.canvass_periodi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvass_id UUID NOT NULL REFERENCES public.canvass(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canvass_periodi ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own canvass_periodi" 
  ON public.canvass_periodi FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvass_periodi" 
  ON public.canvass_periodi FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvass_periodi" 
  ON public.canvass_periodi FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvass_periodi" 
  ON public.canvass_periodi FOR DELETE 
  USING (auth.uid() = user_id);