-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('in_attesa', 'spedito', 'completato', 'annullato');

-- Create enum for client status
CREATE TYPE public.client_status AS ENUM ('premium', 'standard', 'nuovo');

-- Create enum for company status
CREATE TYPE public.company_status AS ENUM ('attivo', 'in_pausa');

-- Create enum for reminder priority
CREATE TYPE public.reminder_priority AS ENUM ('alta', 'media', 'bassa');

-- Create enum for reminder type
CREATE TYPE public.reminder_type AS ENUM ('call', 'email', 'documento', 'scadenza');

-- Create enum for event type
CREATE TYPE public.event_type AS ENUM ('meeting', 'presentazione', 'visita', 'altro');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create aziende (companies) table
CREATE TABLE public.aziende (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  settore TEXT,
  citta TEXT,
  indirizzo TEXT,
  telefono TEXT,
  email TEXT,
  status company_status DEFAULT 'attivo',
  prodotti INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clienti (clients) table
CREATE TABLE public.clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  azienda TEXT,
  email TEXT,
  telefono TEXT,
  fatturato DECIMAL(12,2) DEFAULT 0,
  ordini_count INTEGER DEFAULT 0,
  status client_status DEFAULT 'nuovo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ordini (orders) table
CREATE TABLE public.ordini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE SET NULL,
  codice TEXT UNIQUE,
  prodotti INTEGER DEFAULT 0,
  totale DECIMAL(12,2) DEFAULT 0,
  note TEXT,
  status order_status DEFAULT 'in_attesa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promemoria (reminders) table
CREATE TABLE public.promemoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  orario TIME,
  tipo reminder_type DEFAULT 'documento',
  priorita reminder_priority DEFAULT 'media',
  completato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create eventi (events) table
CREATE TABLE public.eventi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  orario_inizio TIME,
  orario_fine TIME,
  luogo TEXT,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE SET NULL,
  tipo event_type DEFAULT 'meeting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aziende ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promemoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventi ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Aziende policies
CREATE POLICY "Users can view own aziende" ON public.aziende
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own aziende" ON public.aziende
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own aziende" ON public.aziende
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own aziende" ON public.aziende
  FOR DELETE USING (auth.uid() = user_id);

-- Clienti policies
CREATE POLICY "Users can view own clienti" ON public.clienti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clienti" ON public.clienti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clienti" ON public.clienti
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clienti" ON public.clienti
  FOR DELETE USING (auth.uid() = user_id);

-- Ordini policies
CREATE POLICY "Users can view own ordini" ON public.ordini
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ordini" ON public.ordini
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ordini" ON public.ordini
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ordini" ON public.ordini
  FOR DELETE USING (auth.uid() = user_id);

-- Promemoria policies
CREATE POLICY "Users can view own promemoria" ON public.promemoria
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promemoria" ON public.promemoria
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promemoria" ON public.promemoria
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own promemoria" ON public.promemoria
  FOR DELETE USING (auth.uid() = user_id);

-- Eventi policies
CREATE POLICY "Users can view own eventi" ON public.eventi
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eventi" ON public.eventi
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eventi" ON public.eventi
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own eventi" ON public.eventi
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger function for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aziende_updated_at BEFORE UPDATE ON public.aziende
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clienti_updated_at BEFORE UPDATE ON public.clienti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordini_updated_at BEFORE UPDATE ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promemoria_updated_at BEFORE UPDATE ON public.promemoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eventi_updated_at BEFORE UPDATE ON public.eventi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate order code
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.codice := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.order_code_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create sequence for order codes
CREATE SEQUENCE public.order_code_seq START 1;

-- Create trigger for order code generation
CREATE TRIGGER generate_order_code_trigger
  BEFORE INSERT ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_code();