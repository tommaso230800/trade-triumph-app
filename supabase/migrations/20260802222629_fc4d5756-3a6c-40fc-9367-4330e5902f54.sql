-- 1) Colonna colore su aziende
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS colore text;

UPDATE public.aziende SET colore = '#facc15' WHERE nome = 'C & C S.R.L.';
UPDATE public.aziende SET colore = '#f97316' WHERE nome = 'BIBITE POLARA S.R.L.';
UPDATE public.aziende SET colore = '#ef4444' WHERE nome = 'CANTINE QUATTRO VALLI S.R.L.';
UPDATE public.aziende SET colore = '#6b8e23' WHERE nome = 'CASONI LIQUORI S.P.A.';
UPDATE public.aziende SET colore = '#39ff14' WHERE nome = 'RICOLA ITALIA S.R.L.';
UPDATE public.aziende SET colore = '#1e3a8a' WHERE nome = 'ZUEGG S.P.A.';
UPDATE public.aziende SET colore = '#38bdf8' WHERE nome = 'MANIVA SPA';
UPDATE public.aziende SET colore = '#800020' WHERE nome = 'SCHENK ITALIA S.P.A.';
UPDATE public.aziende SET colore = '#ec4899' WHERE nome = 'OPTIMA S.P.A. - DOuMIX!';

-- 2) Storage: policy SELECT mancanti (necessarie per upsert/overwrite dei file)
DROP POLICY IF EXISTS aziende_logos_owner_select ON storage.objects;
CREATE POLICY aziende_logos_owner_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'aziende-logos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS prodotti_images_owner_select ON storage.objects;
CREATE POLICY prodotti_images_owner_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'prodotti-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3) Reload schema PostgREST
NOTIFY pgrst, 'reload schema';