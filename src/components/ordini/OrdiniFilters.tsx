import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { Search, X } from "lucide-react";
import type { Ordine } from "@/hooks/useOrdini";
import type { PeriodoFiltro } from "@/lib/periodFilter";

interface OrdiniFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: Ordine["status"] | "tutti";
  onStatusFilterChange: (value: Ordine["status"] | "tutti") => void;
  periodo: PeriodoFiltro;
  onPeriodoChange: (value: PeriodoFiltro) => void;
  minYear: number;
  clienteFilter: string;
  onClienteFilterChange: (value: string) => void;
  aziendaFilter: string;
  onAziendaFilterChange: (value: string) => void;
  clienteOptions: SearchableSelectOption[];
  aziendaOptions: SearchableSelectOption[];
  onReset?: () => void;
}

const STATUS_LABELS: Record<Ordine["status"] | "tutti", string> = {
  tutti: "Tutti gli stati",
  in_attesa: "In attesa",
  stand_by: "Stand-by",
  spedito: "Spedito",
  completato: "Completato",
  annullato: "Annullato",
};

const fieldCls =
  "h-11 rounded-lg border-scatto-line bg-scatto-bg/60 text-base text-scatto-ink placeholder:text-scatto-muted focus-visible:ring-scatto-accent sm:text-sm";

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-scatto-accent/30 bg-scatto-accent/10 py-1 pl-3 pr-2 text-xs font-semibold text-scatto-accent transition-colors duration-150 hover:bg-scatto-accent/15"
      aria-label={`Rimuovi filtro ${label}`}
    >
      <span className="truncate">{label}</span>
      <X className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

export function OrdiniFilters({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  periodo,
  onPeriodoChange,
  minYear,
  clienteFilter,
  onClienteFilterChange,
  aziendaFilter,
  onAziendaFilterChange,
  clienteOptions,
  aziendaOptions,
  onReset,
}: OrdiniFiltersProps) {
  const clienteLabel = clienteOptions.find((o) => o.value === clienteFilter)?.label;
  const aziendaLabel = aziendaOptions.find((o) => o.value === aziendaFilter)?.label;
  const chips = [
    searchTerm && { key: "q", label: `“${searchTerm}”`, onRemove: () => onSearchTermChange("") },
    clienteFilter && { key: "c", label: clienteLabel || "Cliente", onRemove: () => onClienteFilterChange("") },
    aziendaFilter && { key: "a", label: aziendaLabel || "Fornitore", onRemove: () => onAziendaFilterChange("") },
    statusFilter !== "tutti" && { key: "s", label: STATUS_LABELS[statusFilter], onRemove: () => onStatusFilterChange("tutti") },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-scatto-line bg-scatto-surface p-3 shadow-sm sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scatto-muted" />
        <Input
          type="search"
          placeholder="Cerca per cliente, fornitore, prodotto o riferimento"
          className={`pl-10 pr-10 ${fieldCls}`}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Svuota ricerca"
            onClick={() => onSearchTermChange("")}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-scatto-muted hover:text-scatto-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          options={clienteOptions}
          value={clienteFilter}
          onValueChange={onClienteFilterChange}
          placeholder="Tutti i clienti"
          searchPlaceholder="Cerca cliente..."
          emptyMessage="Nessun cliente trovato"
          className={fieldCls}
        />
        <SearchableSelect
          options={aziendaOptions}
          value={aziendaFilter}
          onValueChange={onAziendaFilterChange}
          placeholder="Tutti i fornitori"
          searchPlaceholder="Cerca fornitore..."
          emptyMessage="Nessun fornitore trovato"
          className={fieldCls}
        />
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as Ordine["status"] | "tutti")}>
          <SelectTrigger className={`w-full min-w-0 ${fieldCls}`} aria-label="Stato">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-scatto-line bg-scatto-surface text-scatto-ink">
            {(["tutti", "in_attesa", "stand_by", "completato", "annullato"] as const).map((s) => (
              <SelectItem key={s} value={s} className="min-h-11 focus:bg-scatto-bg focus:text-scatto-ink">
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PeriodFilter value={periodo} onChange={onPeriodoChange} minYear={minYear} className={`w-full min-w-0 ${fieldCls}`} />
      </div>

      {chips.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-scatto-line pt-3">
          <span className="text-xs text-scatto-muted">Filtri attivi</span>
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
          ))}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="ml-auto min-h-9 px-2 text-xs font-semibold text-scatto-muted underline-offset-4 hover:text-scatto-ink hover:underline"
            >
              Azzera tutto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
