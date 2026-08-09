import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Clock, Ban, Download, X, Loader2 } from "lucide-react";

interface OrdiniSelectionBarProps {
  count: number;
  totalVisible: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onCancel: () => void;
  onVerify: () => void;
  onWait: () => void;
  onCancelOrders: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  pending?: boolean;
}

// Barra raggiungibile col pollice: sta appena sopra la bottom nav mobile
// (bottom-[76px]) e a filo in basso su desktop, spostata a destra della
// sidebar fissa (lg:left-80) per non finirci sotto.
export function OrdiniSelectionBar({
  count,
  totalVisible,
  allSelected,
  onSelectAll,
  onCancel,
  onVerify,
  onWait,
  onCancelOrders,
  onExportCSV,
  onExportPDF,
  pending,
}: OrdiniSelectionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[76px] z-40 border-t border-scatto-line bg-scatto-surface/95 shadow-[0_-4px_20px_rgba(18,20,26,0.1)] backdrop-blur-md lg:bottom-0 lg:left-80">
      <div className="mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-scatto-ink">
            {count} {count === 1 ? "ordine selezionato" : "ordini selezionati"}
          </span>
          <div className="flex items-center gap-3">
            {!allSelected && (
              <button
                type="button"
                onClick={onSelectAll}
                className="touch-target text-xs font-semibold text-scatto-accent"
              >
                Seleziona tutti i {totalVisible} ordini filtrati
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="touch-target flex items-center gap-1 text-xs font-semibold text-scatto-muted"
            >
              <X className="h-3.5 w-3.5" />
              Annulla
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <Button
            size="sm"
            disabled={count === 0 || pending}
            onClick={onVerify}
            className="touch-target min-w-fit gap-1.5 whitespace-nowrap bg-scatto-success font-bold text-white hover:bg-scatto-success/90"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Segna come verificati
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={count === 0 || pending}
            onClick={onWait}
            className="touch-target min-w-fit gap-1.5 whitespace-nowrap border-scatto-line text-scatto-ink hover:bg-scatto-bg"
          >
            <Clock className="h-4 w-4" />
            Metti in attesa
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={count === 0 || pending}
            onClick={onCancelOrders}
            className="touch-target min-w-fit gap-1.5 whitespace-nowrap border-scatto-danger/40 text-scatto-danger hover:bg-scatto-danger/10"
          >
            <Ban className="h-4 w-4" />
            Annulla selezionati
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={count === 0}
                className="touch-target min-w-fit gap-1.5 whitespace-nowrap border-scatto-line text-scatto-ink hover:bg-scatto-bg"
              >
                <Download className="h-4 w-4" />
                Esporta
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-scatto-line bg-scatto-surface text-scatto-ink">
              <DropdownMenuItem onClick={onExportCSV} className="focus:bg-scatto-bg focus:text-scatto-ink">
                Esporta CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPDF} className="focus:bg-scatto-bg focus:text-scatto-ink">
                Esporta PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
