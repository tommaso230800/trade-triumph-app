import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decodePeriodo,
  encodePeriodo,
  periodoOptions,
  type PeriodoFiltro,
} from "@/lib/periodFilter";

interface PeriodFilterProps {
  value: PeriodoFiltro;
  onChange: (p: PeriodoFiltro) => void;
  /** Primo anno dello storico: le opzioni arrivano fino a quell'anno. */
  minYear: number;
  className?: string;
}

/**
 * Selettore unico del periodo: un anno intero oppure un mese specifico.
 * Anni e mesi sono due alternative dello stesso filtro; le opzioni si
 * aggiornano da sole con il calendario (fino al mese in corso).
 */
export function PeriodFilter({ value, onChange, minYear, className }: PeriodFilterProps) {
  const options = periodoOptions(minYear);
  const years = options.filter((o) => o.group === "year");
  const months = options.filter((o) => o.group === "month");
  return (
    <Select
      value={encodePeriodo(value)}
      onValueChange={(v) => {
        const p = decodePeriodo(v);
        if (p) onChange(p);
      }}
    >
      <SelectTrigger className={className} aria-label="Filtra per periodo">
        <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-60" />
        <SelectValue placeholder="Periodo" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectGroup>
          <SelectLabel>Anni</SelectLabel>
          {years.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Mesi</SelectLabel>
          {months.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
