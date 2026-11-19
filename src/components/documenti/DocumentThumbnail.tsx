import { memo, useEffect, useRef, useState } from 'react';
import { getDocumentoSignedUrl } from '@/hooks/useDocumenti';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import '@/lib/pdfDocumentText';
import { FileText } from 'lucide-react';

/**
 * Anteprime leggere per iPhone:
 * - si generano solo quando la miniatura entra nello schermo (non per tutto l'archivio);
 * - al massimo 2 alla volta, così le altre richieste dell'app (salvataggi) non restano in coda;
 * - il risultato resta in memoria: tornando sulla pagina o dopo un salvataggio non si rigenera.
 * Prima ogni aggiornamento della pagina riscaricava e ridisegnava decine di PDF e Safari
 * su iPhone esauriva la memoria (schermo bianco).
 */
const MAX_CACHE = 300;
const cache = new Map<string, string>(); // path -> url immagine ('' = nessuna anteprima)
const inFlight = new Map<string, Promise<string>>();
const MAX_PARALLEL = 2;
let running = 0;
const waiting: Array<() => void> = [];

function remember(path: string, url: string) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(path, url);
}

async function withSlot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await job(); } finally { running--; waiting.shift()?.(); }
}

async function renderPdfThumb(signed: string): Promise<string> {
  const task = getDocument({ url: signed });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) return '';
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const data = canvas.toDataURL('image/jpeg', 0.7);
    canvas.width = 0; canvas.height = 0; // libera subito la memoria del disegno
    return data;
  } finally {
    await task.destroy();
  }
}

function loadThumb(path: string, mime?: string | null): Promise<string> {
  const known = cache.get(path);
  if (known !== undefined) return Promise.resolve(known);
  const pending = inFlight.get(path);
  if (pending) return pending;
  const p = withSlot(async () => {
    const signed = await getDocumentoSignedUrl(path);
    if (mime?.startsWith('image/')) return signed;
    return renderPdfThumb(signed);
  })
    .catch(() => '')
    .then((url) => { remember(path, url); inFlight.delete(path); return url; });
  inFlight.set(path, p);
  return p;
}

function DocumentThumbnailBase({ path, mime, name }: { path?: string; mime?: string | null; name: string }) {
  const supported = !!path && (mime === 'application/pdf' || !!mime?.startsWith('image/'));
  const [url, setUrl] = useState(() => (path ? cache.get(path) ?? '' : ''));
  const [visible, setVisible] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supported || visible) return;
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [supported, visible]);

  useEffect(() => {
    if (!supported || !visible || !path) return;
    let active = true;
    void loadThumb(path, mime).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [supported, visible, path, mime]);

  return (
    <div ref={box} className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {url ? <img src={url} alt={`Anteprima ${name}`} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
    </div>
  );
}

export const DocumentThumbnail = memo(DocumentThumbnailBase);
