import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import worker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { Skeleton } from '@/components/ui/skeleton';

GlobalWorkerOptions.workerSrc = worker;
export function OrderPdfPreview({ file }: { file: Blob }) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setLoading(true); setError(false);
    async function render() {
      const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      cleanup = () => { void task.destroy(); };
      const doc = await task.promise;
      if (disposed || !container.current) { await task.destroy(); return; }
      container.current.replaceChildren();
      for (let i = 1; i <= doc.numPages; i++) {
        if (disposed || !container.current) break;
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        canvas.className = 'w-full h-auto';
        canvas.setAttribute('aria-label', `Proforma pagina ${i}`);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas non disponibile');
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        if (!disposed) container.current.appendChild(canvas);
      }
      if (!disposed) setLoading(false);
    }
    render().catch(() => { if (!disposed) { setError(true); setLoading(false); } });
    return () => { disposed = true; cleanup?.(); };
  }, [file]);
  return <div className="min-h-0 flex-1 overflow-y-auto bg-muted p-2">
    {loading && <Skeleton className="h-80 w-full" />}
    {error && <p className="p-4 text-sm text-destructive">Anteprima non disponibile. Puoi aprire il PDF con il pulsante in basso.</p>}
    <div ref={container} className="space-y-3" />
  </div>;
}