DROP POLICY IF EXISTS "Authenticated can view email_ingest" ON public.email_ingest;
DROP POLICY IF EXISTS "Authenticated can insert email_ingest" ON public.email_ingest;
DROP POLICY IF EXISTS "Authenticated can update email_ingest" ON public.email_ingest;
DROP POLICY IF EXISTS "Authenticated can delete email_ingest" ON public.email_ingest;

CREATE POLICY "Users can view own email_ingest"
ON public.email_ingest
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own email_ingest"
ON public.email_ingest
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own email_ingest"
ON public.email_ingest
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own email_ingest"
ON public.email_ingest
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view email_allegati" ON public.email_allegati;
DROP POLICY IF EXISTS "Authenticated can insert email_allegati" ON public.email_allegati;
DROP POLICY IF EXISTS "Authenticated can update email_allegati" ON public.email_allegati;
DROP POLICY IF EXISTS "Authenticated can delete email_allegati" ON public.email_allegati;

CREATE POLICY "Users can view own email_allegati"
ON public.email_allegati
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.email_ingest e
    WHERE e.id = email_allegati.email_id
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own email_allegati"
ON public.email_allegati
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.email_ingest e
    WHERE e.id = email_allegati.email_id
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own email_allegati"
ON public.email_allegati
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.email_ingest e
    WHERE e.id = email_allegati.email_id
      AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.email_ingest e
    WHERE e.id = email_allegati.email_id
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own email_allegati"
ON public.email_allegati
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.email_ingest e
    WHERE e.id = email_allegati.email_id
      AND e.user_id = auth.uid()
  )
);