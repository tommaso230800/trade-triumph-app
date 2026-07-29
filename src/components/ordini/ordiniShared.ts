import type { Ordine } from "@/hooks/useOrdini";
import type { BadgeProps } from "@/components/ui/badge";

export const statusConfig: Record<Ordine["status"], { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  completato: { label: "Completato", variant: "success" },
  in_attesa: { label: "In Attesa", variant: "warning" },
  spedito: { label: "Spedito", variant: "info" },
  annullato: { label: "Annullato", variant: "destructive" },
  stand_by: { label: "Stand-by", variant: "warning" },
};

// Badge di stato nella direzione "Scatto" (Ordini): pillola piena e decisa
// (non outline), testo bianco sopra il colore semantico — coerente col
// carattere energico/glanceable della pagina.
export const scattoStatusBadge: Record<Ordine["status"], { label: string; bg: string }> = {
  completato: { label: "Completato", bg: "bg-scatto-success" },
  in_attesa: { label: "In attesa", bg: "bg-scatto-warning" },
  spedito: { label: "Spedito", bg: "bg-scatto-info" },
  annullato: { label: "Annullato", bg: "bg-scatto-danger" },
  stand_by: { label: "Stand-by", bg: "bg-scatto-warning" },
};

export const TIPI_PAGAMENTO = [
  "Anticipato",
  "Contanti",
  "Ri.Ba 30gg",
  "Ri.Ba 60gg",
  "Ri.Ba 90gg",
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

// Intl.NumberFormat("it-IT") non raggruppa le migliaia sotto i 5 cifre (es. 1014 -> "1014"),
// quindi raggruppiamo a mano per avere sempre "1.014" come da convenzione italiana.
export const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const numeroRigheOrdine = (ordine: Pick<Ordine, "ordini_righe">) =>
  ordine.ordini_righe?.[0]?.count ?? 0;

export const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
