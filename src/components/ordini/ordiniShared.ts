import type { Ordine } from "@/hooks/useOrdini";
import type { BadgeProps } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import type { OrdineCardAction } from "./OrdineCard";

export interface OrdiniTableRow {
  ordine: Ordine;
  muted?: boolean;
  actions: OrdineCardAction[];
  primaryAction?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    pending?: boolean;
  };
  giorniInStandBy?: number;
}

export const statusConfig: Record<Ordine["status"], { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  completato: { label: "Completato", variant: "success" },
  in_attesa: { label: "In Attesa", variant: "warning" },
  spedito: { label: "Spedito", variant: "info" },
  annullato: { label: "Annullato", variant: "destructive" },
  stand_by: { label: "Stand-by", variant: "warning" },
};

// Etichette di stato mostrate nella fascia colorata della card (il colore del
// badge è deciso in OrdineCard in base allo stato: verificato/in_attesa hanno
// una tinta propria, gli altri un overlay neutro che si adatta al chiaro/scuro
// della fascia).
export const scattoStatusBadge: Record<Ordine["status"], { label: string }> = {
  completato: { label: "Completato" },
  in_attesa: { label: "In attesa" },
  spedito: { label: "Spedito" },
  annullato: { label: "Annullato" },
  stand_by: { label: "Stand-by" },
};

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
