-- Add commission payment tracking to orders
ALTER TABLE public.ordini ADD COLUMN provvigione_pagata boolean NOT NULL DEFAULT false;