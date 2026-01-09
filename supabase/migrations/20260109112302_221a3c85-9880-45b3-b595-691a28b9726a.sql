-- Fix RLS policies for aziende table
DROP POLICY IF EXISTS "Authenticated users can view aziende" ON public.aziende;
DROP POLICY IF EXISTS "Authenticated users can insert aziende" ON public.aziende;
DROP POLICY IF EXISTS "Authenticated users can update aziende" ON public.aziende;
DROP POLICY IF EXISTS "Authenticated users can delete aziende" ON public.aziende;

CREATE POLICY "Users can view own aziende" ON public.aziende
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own aziende" ON public.aziende
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own aziende" ON public.aziende
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own aziende" ON public.aziende
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for ordini table
DROP POLICY IF EXISTS "Authenticated users can view ordini" ON public.ordini;
DROP POLICY IF EXISTS "Authenticated users can insert ordini" ON public.ordini;
DROP POLICY IF EXISTS "Authenticated users can update ordini" ON public.ordini;
DROP POLICY IF EXISTS "Authenticated users can delete ordini" ON public.ordini;

CREATE POLICY "Users can view own ordini" ON public.ordini
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ordini" ON public.ordini
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ordini" ON public.ordini
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ordini" ON public.ordini
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for clienti table
DROP POLICY IF EXISTS "Authenticated users can view clienti" ON public.clienti;
DROP POLICY IF EXISTS "Authenticated users can insert clienti" ON public.clienti;
DROP POLICY IF EXISTS "Authenticated users can update clienti" ON public.clienti;
DROP POLICY IF EXISTS "Authenticated users can delete clienti" ON public.clienti;

CREATE POLICY "Users can view own clienti" ON public.clienti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clienti" ON public.clienti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clienti" ON public.clienti
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clienti" ON public.clienti
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for eventi table
DROP POLICY IF EXISTS "Authenticated users can view eventi" ON public.eventi;
DROP POLICY IF EXISTS "Authenticated users can insert eventi" ON public.eventi;
DROP POLICY IF EXISTS "Authenticated users can update eventi" ON public.eventi;
DROP POLICY IF EXISTS "Authenticated users can delete eventi" ON public.eventi;

CREATE POLICY "Users can view own eventi" ON public.eventi
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eventi" ON public.eventi
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eventi" ON public.eventi
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own eventi" ON public.eventi
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for ordini_righe table
DROP POLICY IF EXISTS "Authenticated users can view ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Authenticated users can insert ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Authenticated users can update ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Authenticated users can delete ordini_righe" ON public.ordini_righe;

CREATE POLICY "Users can view own ordini_righe" ON public.ordini_righe
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ordini_righe" ON public.ordini_righe
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ordini_righe" ON public.ordini_righe
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ordini_righe" ON public.ordini_righe
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for prodotti table
DROP POLICY IF EXISTS "Authenticated users can view prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Authenticated users can insert prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Authenticated users can update prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Authenticated users can delete prodotti" ON public.prodotti;

CREATE POLICY "Users can view own prodotti" ON public.prodotti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prodotti" ON public.prodotti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prodotti" ON public.prodotti
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prodotti" ON public.prodotti
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for promemoria table
DROP POLICY IF EXISTS "Authenticated users can view promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Authenticated users can insert promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Authenticated users can update promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Authenticated users can delete promemoria" ON public.promemoria;

CREATE POLICY "Users can view own promemoria" ON public.promemoria
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promemoria" ON public.promemoria
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promemoria" ON public.promemoria
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own promemoria" ON public.promemoria
  FOR DELETE USING (auth.uid() = user_id);