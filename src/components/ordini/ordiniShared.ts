import type { Ordine } from "@/hooks/useOrdini";
import type { BadgeProps } from "@/components/ui/badge";

export const statusConfig: Record<Ordine["status"], { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  completato: { label: "Completato", variant: "success" },
  in_attesa: { label: "In Attesa", variant: "warning" },
  spedito: { label: "Spedito", variant: "info" },
  annullato: { label: "Annullato", variant: "destructive" },
  stand_by: { label: "Stand-by", variant: "warning" },
};

// Badge di stato nella direzione "Scatto/Pill" (Ordini): tinta tenue del
// colore semantico + testo colorato (non pillola piena bianco-su-colore),
// coerente col carattere morbido della pagina. "Completato" è neutro/grigio:
// il verde resta esclusivo di "Verificato" per non confondere i due stati.
export const scattoStatusBadge: Record<Ordine["status"], { label: string; className: string }> = {
  completato: { label: "Completato", className: "bg-scatto-muted/15 text-scatto-muted" },
  in_attesa: { label: "In attesa", className: "bg-scatto-warning/15 text-scatto-warning" },
  spedito: { label: "Spedito", className: "bg-scatto-info/15 text-scatto-info" },
  annullato: { label: "Annullato", className: "bg-scatto-danger/15 text-scatto-danger" },
  stand_by: { label: "Stand-by", className: "bg-scatto-warning/15 text-scatto-warning" },
};

export const scattoVerificatoBadgeClass = "bg-scatto-success/15 text-scatto-success";

export const TIPI_PAGAMENTO = [
  "Anticipato",
  "Contanti",
  "Ri.Ba 30gg",
  "Ri.Ba 60gg",
  "Ri.Ba 90gg",
];

// Intl.NumberFormat("it-IT") non raggruppa le migliaia sotto i 5 cifre (es. 1014 -> "1014",
// o 4788,00 invece di 4.788,00 con style:"currency"), quindi raggruppiamo a mano.
export const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatCurrency = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const intPart = Math.floor(abs);
  const decPart = Math.round((abs - intPart) * 100).toString().padStart(2, "0");
  return `${sign}${formatNumberIT(intPart)},${decPart} €`;
};

export const getIniziali = (nome?: string | null) => {
  if (!nome) return "—";
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const numeroRigheOrdine = (ordine: Pick<Ordine, "ordini_righe">) =>
  ordine.ordini_righe?.[0]?.count ?? 0;

export const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
