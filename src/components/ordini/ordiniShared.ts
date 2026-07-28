import type { Ordine } from "@/hooks/useOrdini";
import type { BadgeProps } from "@/components/ui/badge";

export const statusConfig: Record<Ordine["status"], { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  completato: { label: "Completato", variant: "success" },
  in_attesa: { label: "In Attesa", variant: "warning" },
  spedito: { label: "Spedito", variant: "info" },
  annullato: { label: "Annullato", variant: "destructive" },
  stand_by: { label: "Stand-by", variant: "warning" },
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

export const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
