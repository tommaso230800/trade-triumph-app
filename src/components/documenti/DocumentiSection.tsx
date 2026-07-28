import { useRef, useState } from "react";
import {
  Documento,
  DocumentoEntita,
  DocumentoTipo,
  TIPO_LABEL,
  useDocumenti,
  useUploadDocumento,
  useUpdateDocumento,
  useDeleteDocumento,
  getDocumentoSignedUrl,
} from "@/hooks/useDocumenti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Upload, MoreVertical, Trash2, Download, Eye, Sparkles,
  CheckCircle2, Loader2, Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  entita: DocumentoEntita;
  entita_id?: string | null;
  title?: string;
  compact?: boolean;
}

function humanSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const TIPO_ORDER: DocumentoTipo[] = [
  "ordine_originale","conferma_ordine","fattura","nota_credito","contratto",
  "listino","accordo_provv","promo","email","estratto_provv","altro",
];

export function DocumentiSection({ entita, entita_id, title = "Documenti", compact }: Props) {
  const { data: docs = [], isLoading } = useDocumenti(entita, entita_id);
  const upload = useUploadDocumento();
  const update = useUpdateDocumento();
  const del = useDeleteDocumento();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingTipo, setPendingTipo] = useState<DocumentoTipo>("altro");
  const [editDoc, setEditDoc] = useState<Documento | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      await upload.mutateAsync({ file: f, entita, entita_id, tipo: pendingTipo });
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpen = async (doc: Documento) => {
    const url = await getDocumentoSignedUrl(doc.storage_path);
    setPreviewing(url);
  };

  const handleDownload = async (doc: Documento) => {
    const url = await getDocumentoSignedUrl(doc.storage_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nome_file;
    a.click();
  };

  return (
    <Card className="p-4 md:p-6 surface-noir">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="secondary">{docs.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={pendingTipo} onValueChange={(v) => setPendingTipo(v as DocumentoTipo)}>
            <SelectTrigger className="w-[160px] sm:w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_ORDER.map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Carica
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4">Caricamento…</div>
      ) : docs.length === 0 ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
        >
          Nessun documento. Trascina qui i file o usa il pulsante Carica.
        </div>
      ) : (
        <div className={cn("grid gap-2", compact ? "" : "md:grid-cols-2")}>
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover-lift bg-card"
            >
              <div className="mt-1">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="font-medium text-sm truncate text-left hover:underline"
                    onClick={() => handleOpen(d)}
                    title={d.nome_file}
                  >
                    {d.nome_file}
                  </button>
                  <Badge variant="outline" className="text-xs">{TIPO_LABEL[d.tipo]}</Badge>
                  {d.verificato && (
                    <Badge className="text-xs bg-green-600/20 text-green-500 border-green-600/40">
                      <CheckCircle2 className="h-3 w-3 mr-1" />verificato
                    </Badge>
                  )}
                  {d.classificazione_ai && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />AI
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>{format(new Date(d.created_at), "dd MMM yyyy HH:mm", { locale: it })}</span>
                  <span>·</span>
                  <span>{humanSize(d.dimensione)}</span>
                  {d.note && <><span>·</span><span className="truncate max-w-[200px]">{d.note}</span></>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpen(d)}>
                    <Eye className="h-4 w-4 mr-2" />Apri
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(d)}>
                    <Download className="h-4 w-4 mr-2" />Scarica
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditDoc(d)}>
                    Modifica tipo / note
                  </DropdownMenuItem>
                  {!d.verificato && (
                    <DropdownMenuItem onClick={() => update.mutate({ id: d.id, verificato: true })}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />Segna come verificato
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => { if (confirm(`Eliminare "${d.nome_file}"?`)) del.mutate(d); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90dvh] p-0 overflow-hidden">
          {previewing && (
            <iframe src={previewing} className="w-full h-[85dvh]" title="Documento" />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editDoc} onOpenChange={(o) => !o && setEditDoc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica documento</DialogTitle></DialogHeader>
          {editDoc && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome file</label>
                <Input
                  value={editDoc.nome_file}
                  onChange={(e) => setEditDoc({ ...editDoc, nome_file: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={editDoc.tipo}
                  onValueChange={(v) => setEditDoc({ ...editDoc, tipo: v as DocumentoTipo })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Note</label>
                <Textarea
                  value={editDoc.note ?? ""}
                  onChange={(e) => setEditDoc({ ...editDoc, note: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDoc(null)}>Annulla</Button>
            <Button
              onClick={() => {
                if (!editDoc) return;
                update.mutate({
                  id: editDoc.id,
                  nome_file: editDoc.nome_file,
                  tipo: editDoc.tipo,
                  note: editDoc.note,
                });
                setEditDoc(null);
              }}
            >Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
