import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Search, Filter } from "lucide-react";
import type { Ordine } from "@/hooks/useOrdini";

const getMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
};

interface OrdiniFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: Ordine["status"] | "tutti";
  onStatusFilterChange: (value: Ordine["status"] | "tutti") => void;
  monthFilters: string[];
  onMonthFiltersChange: (value: string[]) => void;
}

const inputCls =
  "rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink placeholder:text-scatto-muted focus-visible:ring-scatto-accent";

export function OrdiniFilters({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  monthFilters,
  onMonthFiltersChange,
}: OrdiniFiltersProps) {
  return (
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
      <MultiSelect
        className={`w-full sm:w-64 ${inputCls}`}
        placeholder="Filtra per mese"
        values={monthFilters}
        onValuesChange={onMonthFiltersChange}
        options={getMonthOptions()}
      />
    </div>
  );
}
