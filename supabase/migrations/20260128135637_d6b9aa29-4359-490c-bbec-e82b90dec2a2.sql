-- Create table for client visits
CREATE TABLE public.client_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  titolo TEXT,
  esito TEXT,
  note_visita TEXT,
  azioni_future TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own client_visits" 
ON public.client_visits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client_visits" 
ON public.client_visits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client_visits" 
ON public.client_visits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client_visits" 
ON public.client_visits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_client_visits_updated_at
BEFORE UPDATE ON public.client_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();