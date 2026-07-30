import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileCheck2, ExternalLink, Trash2, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useDocumenti, useUploadDocumento, useDeleteDocumento, getDocumentoSignedUrl } from "@/hooks/useDocumenti";
import { useSetOrdineVerificatoConferma } from "@/hooks/useOrdiniConferme";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ordineId: string | null;
  ordineCodice?: string;
}

export function ConfermaOrdineDialog({ open, onOpenChange, ordineId, ordineCodice }: Props) {
  const { data: documenti, isLoading } = useDocumenti("ordine", ordineId);
  const upload = useUploadDocumento();
  const remove = useDeleteDocumento();
  const setVerificato = useSetOrdineVerificatoConferma();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conferma = (documenti || []).find((d) => d.tipo === "conferma_ordine");

  const handleFile = async (file: File | null) => {
    if (!file || !ordineId) return;
    setIsUploading(true);
    try {
      await upload.mutateAsync({ file, entita: "ordine", entita_id: ordineId, tipo: "conferma_ordine" });
      await setVerificato.mutateAsync({ ordine_id: ordineId, verificato: true });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpen = async () => {
    if (!conferma) return;
    try {
      const url = await getDocumentoSignedUrl(conferma.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Errore apertura documento: " + e.message);
    }
  };

  const handleRemove = async () => {
    if (!conferma || !ordineId) return;
    await remove.mutateAsync(conferma);
    await setVerificato.mutateAsync({ ordine_id: ordineId, verificato: false });
  };

  const isBusy = isUploading || upload.isPending || remove.isPending || setVerificato.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conferma Ordine {ordineCodice}</DialogTitle>
          <DialogDescription>
            Carica la conferma d'ordine ricevuta dall'azienda: l'ordine viene segnato automaticamente come verificato.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Caricamento…
          </div>
        ) : conferma ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3">
              <FileCheck2 className="h-5 w-5 flex-shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{conferma.nome_file}</p>
                <p className="text-xs text-muted-foreground">
                  Caricata il {format(new Date(conferma.created_at), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 rounded-lg" onClick={handleOpen} disabled={isBusy}>
                <ExternalLink className="h-4 w-4" />
                Apri
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 rounded-lg text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                Rimuovi
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/50">
            {isBusy ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">
              {isBusy ? "Caricamento…" : "Tocca per scegliere il file"}
            </span>
            <span className="text-xs text-muted-foreground">PDF, Excel o immagine</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,image/*"
              className="hidden"
              disabled={isBusy}
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </DialogContent>
    </Dialog>
  );
}
