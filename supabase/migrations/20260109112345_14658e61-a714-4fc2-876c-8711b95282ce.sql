-- Restrict all policies to authenticated users only (not anonymous)
-- Recreate policies with TO authenticated clause

-- aziende
DROP POLICY IF EXISTS "Users can view own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can insert own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can update own aziende" ON public.aziende;
DROP POLICY IF EXISTS "Users can delete own aziende" ON public.aziende;

CREATE POLICY "Users can view own aziende" ON public.aziende
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own aziende" ON public.aziende
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own aziende" ON public.aziende
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own aziende" ON public.aziende
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ordini
DROP POLICY IF EXISTS "Users can view own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can insert own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can update own ordini" ON public.ordini;
DROP POLICY IF EXISTS "Users can delete own ordini" ON public.ordini;

CREATE POLICY "Users can view own ordini" ON public.ordini
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ordini" ON public.ordini
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ordini" ON public.ordini
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ordini" ON public.ordini
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- clienti
DROP POLICY IF EXISTS "Users can view own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can insert own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can update own clienti" ON public.clienti;
DROP POLICY IF EXISTS "Users can delete own clienti" ON public.clienti;

CREATE POLICY "Users can view own clienti" ON public.clienti
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clienti" ON public.clienti
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clienti" ON public.clienti
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clienti" ON public.clienti
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- eventi
DROP POLICY IF EXISTS "Users can view own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can insert own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can update own eventi" ON public.eventi;
DROP POLICY IF EXISTS "Users can delete own eventi" ON public.eventi;

CREATE POLICY "Users can view own eventi" ON public.eventi
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eventi" ON public.eventi
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eventi" ON public.eventi
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own eventi" ON public.eventi
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ordini_righe
DROP POLICY IF EXISTS "Users can view own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can insert own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can update own ordini_righe" ON public.ordini_righe;
DROP POLICY IF EXISTS "Users can delete own ordini_righe" ON public.ordini_righe;

CREATE POLICY "Users can view own ordini_righe" ON public.ordini_righe
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ordini_righe" ON public.ordini_righe
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ordini_righe" ON public.ordini_righe
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ordini_righe" ON public.ordini_righe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- prodotti
DROP POLICY IF EXISTS "Users can view own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can insert own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can update own prodotti" ON public.prodotti;
DROP POLICY IF EXISTS "Users can delete own prodotti" ON public.prodotti;

CREATE POLICY "Users can view own prodotti" ON public.prodotti
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prodotti" ON public.prodotti
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prodotti" ON public.prodotti
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prodotti" ON public.prodotti
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- promemoria
DROP POLICY IF EXISTS "Users can view own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can insert own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can update own promemoria" ON public.promemoria;
DROP POLICY IF EXISTS "Users can delete own promemoria" ON public.promemoria;

CREATE POLICY "Users can view own promemoria" ON public.promemoria
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promemoria" ON public.promemoria
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promemoria" ON public.promemoria
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own promemoria" ON public.promemoria
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);