
-- Add logo_url column to aziende
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('aziende-logos', 'aziende-logos', true) ON CONFLICT DO NOTHING;

-- Storage policies for logos
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'aziende-logos');
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'aziende-logos');
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'aziende-logos');
CREATE POLICY "Authenticated users can delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'aziende-logos');

-- Update RLS policies for aziende to allow anonymous users
DROP POLICY IF EXISTS "Users can view own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can insert own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can update own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can delete own aziende" ON public.aziende;

CREATE POLICY "Authenticated users can view aziende" ON public.aziende FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert aziende" ON public.aziende FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update aziende" ON public.aziende FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete aziende" ON public.aziende FOR DELETE USING (auth.uid() IS NOT NULL);

-- Same for other tables
DROP POLICY IF EXISTS "Users can view own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can insert own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can update own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can delete own clienti" ON public.clienti;

CREATE POLICY "Authenticated users can view clienti" ON public.clienti FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert clienti" ON public.clienti FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update clienti" ON public.clienti FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete clienti" ON public.clienti FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can insert own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can update own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can delete own ordini" ON public.ordini;

CREATE POLICY "Authenticated users can view ordini" ON public.ordini FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert ordini" ON public.ordini FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update ordini" ON public.ordini FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete ordini" ON public.ordini FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can insert own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can update own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can delete own prodotti" ON public.prodotti;

CREATE POLICY "Authenticated users can view prodotti" ON public.prodotti FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert prodotti" ON public.prodotti FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update prodotti" ON public.prodotti FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete prodotti" ON public.prodotti FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can insert own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can update own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can delete own ordini_righe" ON public.ordini_righe;

CREATE POLICY "Authenticated users can view ordini_righe" ON public.ordini_righe FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert ordini_righe" ON public.ordini_righe FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update ordini_righe" ON public.ordini_righe FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete ordini_righe" ON public.ordini_righe FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can insert own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can update own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can delete own eventi" ON public.eventi;

CREATE POLICY "Authenticated users can view eventi" ON public.eventi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert eventi" ON public.eventi FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update eventi" ON public.eventi FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete eventi" ON public.eventi FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can insert own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can update own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can delete own promemoria" ON public.promemoria;

CREATE POLICY "Authenticated users can view promemoria" ON public.promemoria FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert promemoria" ON public.promemoria FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update promemoria" ON public.promemoria FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete promemoria" ON public.promemoria FOR DELETE USING (auth.uid() IS NOT NULL);
