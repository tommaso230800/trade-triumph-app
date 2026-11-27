import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Momenti": piccole interazioni di feedback ispirate a UI Moments
 * (https://github.com/guanmo-ai/ui-moments, di 观默 Guanmo, licenza MIT).
 * Solo come risposta a un'azione dell'utente, 200–250 ms, nessun bagliore,
 * nessuna animazione continua; con "riduci movimento" restano statici.
 *
 * - useSlidingThumb + SlidingThumb ("Segmented" / "Tab Bar"): quando cambia
 *   la scelta, una pillola scorre dalla voce precedente alla nuova. Copia
 *   colore, ombra, bordo e raggio della voce attiva, quindi funziona in ogni
 *   design senza colori scritti a mano. Finito lo scorrimento sparisce e
 *   resta lo stile normale della voce.
 * - Bump ("Cart Badge"): un numero che cambia fa un breve "pop".
 * - PulseDots ("Pulse Dots"): attesa di una risposta richiesta dall'utente.
 */

type Box = { x: number; y: number; w: number; h: number };

const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const DURATION = 200;

/** Ultima posizione nota per i contenitori che si rimontano a ogni pagina. */
const lastBoxes = new Map<string, Box>();

/**
 * `selector` individua, dentro il contenitore, l'elemento attivo
 * (es. ':scope > [aria-pressed="true"]'). Il contenitore deve essere
 * `relative` e le voci `relative`, così restano sopra la pillola.
 * `persistKey` serve quando il contenitore viene rimontato a ogni cambio
 * pagina (es. la barra in basso): la partenza è l'ultima posizione salvata.
 */
export function useSlidingThumb<T extends HTMLElement>(selector: string, persistKey?: string) {
  const [list, setList] = useState<T | null>(null);
  const [thumb, setThumb] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!list || !thumb) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const measure = (el: Element): Box => {
      const l = list.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: r.left - l.left + list.scrollLeft, y: r.top - l.top + list.scrollTop, w: r.width, h: r.height };
    };
    const place = (b: Box) => {
      thumb.style.width = `${b.w}px`;
      thumb.style.height = `${b.h}px`;
      thumb.style.transform = `translate(${b.x}px, ${b.y}px)`;
    };
    const remember = (el: Element | null) => {
      if (!persistKey) return;
      if (el) lastBoxes.set(persistKey, measure(el));
      else lastBoxes.delete(persistKey);
    };

    let prevEl: Element | null = null;
    let hidden: Element | null = null;
    let timer: number | undefined;

    const finish = () => {
      if (hidden instanceof HTMLElement) {
        // Ripristina lo sfondo della voce senza dissolvenza, così non sfarfalla.
        const prevTransition = hidden.style.transition;
        hidden.style.transition = "none";
        hidden.removeAttribute("data-thumb-hide");
        void getComputedStyle(hidden).backgroundColor;
        hidden.style.transition = prevTransition;
      }
      hidden = null;
      thumb.style.opacity = "0";
    };

    const slide = (el: Element, from: Box) => {
      const to = measure(el);
      if (reduce?.matches || to.w === 0 || from.w === 0) return finish();
      if (Math.abs(to.x - from.x) < 1 && Math.abs(to.y - from.y) < 1 && Math.abs(to.w - from.w) < 1) return finish();
      window.clearTimeout(timer);
      hidden?.removeAttribute("data-thumb-hide");
      // Legge lo stile finale della voce attiva, senza la sua transizione di colore in corso.
      const item = el as HTMLElement;
      const itemTransition = item.style.transition;
      item.style.transition = "none";
      const cs = getComputedStyle(el);
      void cs.backgroundColor;
      thumb.style.transition = "none";
      thumb.style.backgroundColor = cs.backgroundColor;
      thumb.style.boxShadow = cs.boxShadow;
      thumb.style.borderRadius = cs.borderRadius;
      thumb.style.borderStyle = cs.borderTopStyle;
      thumb.style.borderWidth = cs.borderTopWidth;
      thumb.style.borderColor = cs.borderTopColor;
      place(from);
      thumb.style.opacity = "1";
      el.setAttribute("data-thumb-hide", "");
      hidden = el;
      item.style.transition = itemTransition;
      void thumb.offsetWidth; // applica la posizione di partenza prima della transizione
      thumb.style.transition = `transform ${DURATION}ms ${EASE}, width ${DURATION}ms ${EASE}, height ${DURATION}ms ${EASE}`;
      place(to);
      timer = window.setTimeout(finish, DURATION + 20);
    };

    const sync = () => {
      const el = list.querySelector(selector);
      if (el === prevEl) return;
      const from = prevEl && prevEl.isConnected ? measure(prevEl) : null;
      prevEl = el;
      if (el && from) slide(el, from);
      else finish();
      remember(el);
    };

    // Primo montaggio: se il contenitore era già stato mostrato altrove
    // (pagina precedente), parte dalla posizione salvata.
    prevEl = list.querySelector(selector);
    const saved = persistKey ? lastBoxes.get(persistKey) : undefined;
    if (prevEl && saved) slide(prevEl, saved);
    remember(prevEl);

    const mo = new MutationObserver(sync);
    mo.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-current", "data-state"] });
    return () => {
      mo.disconnect();
      window.clearTimeout(timer);
      hidden?.removeAttribute("data-thumb-hide");
    };
  }, [list, thumb, selector, persistKey]);

  return { listRef: setList, thumbRef: setThumb };
}

/** La pillola che scorre: va messa come primo figlio del contenitore. */
export const SlidingThumb = forwardRef<HTMLSpanElement, { className?: string }>(({ className }, ref) => (
  <span
    ref={ref}
    aria-hidden
    data-thumb
    className={cn("pointer-events-none absolute left-0 top-0 box-border opacity-0", className)}
  />
));
SlidingThumb.displayName = "SlidingThumb";

/** Breve "pop" quando `value` cambia (non al primo render). */
export function Bump({ value, children, className }: { value: unknown; children: ReactNode; className?: string }) {
  const [n, setN] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setN((k) => k + 1);
  }, [value]);
  return (
    <span key={n} className={cn("inline-block", n > 0 && "moment-bump", className)}>
      {children}
    </span>
  );
}

/** Tre puntini in attesa di una risposta (sostituisce lo spinner). */
export function PulseDots({ className, label = "Attendere" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("moment-dots inline-flex items-center gap-1", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}
