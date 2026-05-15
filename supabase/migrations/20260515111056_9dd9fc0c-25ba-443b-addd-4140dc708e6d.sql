-- Notes table for sales agent notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titolo TEXT NOT NULL DEFAULT '',
  contenuto TEXT,
  categoria TEXT NOT NULL DEFAULT 'generale',
  cliente_id UUID,
  azienda_id UUID,
  pinned BOOLEAN NOT NULL DEFAULT false,
  priorita TEXT NOT NULL DEFAULT 'media',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  completata BOOLEAN NOT NULL DEFAULT false,
  colore TEXT,
  data_promemoria DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notes_user_pinned ON public.notes(user_id, pinned DESC, updated_at DESC);
CREATE INDEX idx_notes_cliente ON public.notes(cliente_id);
CREATE INDEX idx_notes_categoria ON public.notes(user_id, categoria);