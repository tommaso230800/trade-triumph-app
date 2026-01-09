-- Add image_url to prodotti
ALTER TABLE public.prodotti 
ADD COLUMN IF NOT EXISTS immagine_url text;

-- Add discount, merchandise discount and payment type to ordini
ALTER TABLE public.ordini 
ADD COLUMN IF NOT EXISTS sconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sconto_merce numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_pagamento text DEFAULT 'Contanti';

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('prodotti-images', 'prodotti-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product images bucket
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'prodotti-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'prodotti-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'prodotti-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'prodotti-images' AND auth.uid() IS NOT NULL);