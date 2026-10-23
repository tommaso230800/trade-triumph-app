import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { Search, Filter, X } from "lucide-react";
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
}

const inputCls =
  "rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink placeholder:text-scatto-muted focus-visible:ring-scatto-accent";

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
}: OrdiniFiltersProps) {
  const clearBtnCls =
    "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-scatto-line bg-scatto-surface text-scatto-muted hover:bg-scatto-bg";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2">
          <SearchableSelect
            options={clienteOptions}
            value={clienteFilter}
            onValueChange={onClienteFilterChange}
            placeholder="Cliente: tutti"
            searchPlaceholder="Cerca cliente..."
            emptyMessage="Nessun cliente trovato"
            className={`h-11 ${inputCls}`}
          />
          {clienteFilter && (
            <button
              type="button"
              aria-label="Rimuovi filtro cliente"
              className={clearBtnCls}
              onClick={() => onClienteFilterChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-1 items-center gap-2">
          <SearchableSelect
            options={aziendaOptions}
            value={aziendaFilter}
            onValueChange={onAziendaFilterChange}
            placeholder="Azienda: tutte"
            searchPlaceholder="Cerca azienda..."
            emptyMessage="Nessuna azienda trovata"
            className={`h-11 ${inputCls}`}
          />
          {aziendaFilter && (
            <button
              type="button"
              aria-label="Rimuovi filtro azienda"
              className={clearBtnCls}
              onClick={() => onAziendaFilterChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scatto-muted" />
        <Input
          placeholder="Cerca cliente, azienda o prodotto..."
          className={`pl-10 ${inputCls}`}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as Ordine["status"] | "tutti")}>
        <SelectTrigger className={`w-full sm:w-40 ${inputCls}`}>
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="border-scatto-line bg-scatto-surface text-scatto-ink">
          <SelectItem value="tutti" className="focus:bg-scatto-bg focus:text-scatto-ink">Tutti</SelectItem>
          <SelectItem value="in_attesa" className="focus:bg-scatto-bg focus:text-scatto-ink">In attesa</SelectItem>
          <SelectItem value="stand_by" className="focus:bg-scatto-bg focus:text-scatto-ink">Stand-by</SelectItem>
          
          <SelectItem value="completato" className="focus:bg-scatto-bg focus:text-scatto-ink">Completato</SelectItem>
          <SelectItem value="annullato" className="focus:bg-scatto-bg focus:text-scatto-ink">Annullato</SelectItem>
        </SelectContent>
      </Select>
      <PeriodFilter
        value={periodo}
        onChange={onPeriodoChange}
        minYear={minYear}
        className={`w-full sm:w-48 ${inputCls}`}
      />
      </div>
    </div>
  );
}
