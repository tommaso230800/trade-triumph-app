import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Cloud, CloudOff, RefreshCw, FolderOpen, Folder, File, ChevronRight, ArrowLeft,
  Loader2, Pause, Play, AlertTriangle, CheckCircle2, Clock, History,
} from "lucide-react";
import {
  useOneDriveStatus, useOneDriveBrowse, useOneDriveEventi,
  useOneDriveConfigure, useOneDrivePull, useOneDriveSuspend, useOneDriveResume,
} from "@/hooks/useOneDriveSync";

function formatBytes(n: number | null | undefined) {
  if (n == null) return "N/D";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  return `${(n / 1e3).toFixed(0)} KB`;
}

function formatData(iso: string | null | undefined) {
  if (!iso) return "Mai";
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EVENTO_LABEL: Record<string, string> = {
  importato: "Importato da OneDrive",
  aggiornato: "Aggiornato da OneDrive",
  caricato: "Caricato su OneDrive",
  duplicato: "Duplicato rilevato",
  conflitto: "Conflitto di versione",
  eliminato_remoto: "Eliminato su OneDrive",
  configurazione: "Configurazione",
  sospensione: "Sincronizzazione sospesa",
  ripresa: "Sincronizzazione ripresa",
};

function FolderPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string | null, path: string) => void }) {
  const [stack, setStack] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "OneDrive" }]);
  const current = stack[stack.length - 1];
  const { data, isLoading } = useOneDriveBrowse(current.id, open);
  const currentPath = "/" + stack.slice(1).map((s) => s.name).join("/");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setStack([{ id: null, name: "OneDrive" }]); onClose(); } }}>
      <DialogContent className="max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Scegli la cartella da sincronizzare</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          {stack.length > 1 && (
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setStack((s) => s.slice(0, -1))}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="truncate">{currentPath === "/" ? "/ (radice)" : currentPath}</span>
        </div>
        <div className="flex-1 min-h-[200px] max-h-[55dvh] overflow-y-auto overscroll-contain -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1">
              {[...(data?.items ?? [])].sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, "it")).map((it) => (
                <button
                  key={it.id}
                  disabled={!it.isFolder}
                  onClick={() => it.isFolder && setStack((s) => [...s, { id: it.id, name: it.name }])}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent disabled:opacity-50 min-h-[44px]"
                >
                  {it.isFolder ? <Folder className="h-4 w-4 shrink-0 text-primary" /> : <File className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="flex-1 truncate">{it.name}</span>
                  {it.isFolder && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))}
              {data?.items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Cartella vuota</p>}
            </div>
          )}
        </div>
        <Button onClick={() => { onPick(current.id, currentPath); setStack([{ id: null, name: "OneDrive" }]); onClose(); }}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Sincronizza questa cartella
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function OneDrivePanel() {
  const { data, isLoading, isError, error, refetch } = useOneDriveStatus();
  const { data: eventi } = useOneDriveEventi();
  const configure = useOneDriveConfigure();
  const pull = useOneDrivePull();
  const suspend = useOneDriveSuspend();
  const resume = useOneDriveResume();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cloud className="h-5 w-5" />Microsoft OneDrive</CardTitle></CardHeader>
        <CardContent><div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CloudOff className="h-5 w-5" />Microsoft OneDrive</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Connessione non riuscita: {(error as Error)?.message}</p>
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Verifica connessione</Button>
        </CardContent>
      </Card>
    );
  }

  const state = data?.state;
  const quota = data?.drive.quota;
  const configurato = !!state?.root_folder_id;
  const sospesa = state?.stato === "sospesa";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cloud className="h-5 w-5" />Microsoft OneDrive
          {configurato && !sospesa && <Badge variant="default" className="ml-auto">Attiva</Badge>}
          {sospesa && <Badge variant="secondary" className="ml-auto">Sospesa</Badge>}
          {!configurato && <Badge variant="outline" className="ml-auto">Da configurare</Badge>}
        </CardTitle>
        <CardDescription>Sincronizzazione bidirezionale dei documenti con il tuo account Microsoft 365.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Account</p>
            <p className="font-medium truncate">{data?.drive.email ?? data?.drive.name ?? "Collegato"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cartella sincronizzata</p>
            <p className="font-medium truncate">{state?.root_folder_path ?? "Non scelta"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ultima sincronizzazione</p>
            <p className="font-medium">{formatData(state?.ultima_sync_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spazio OneDrive</p>
            <p className="font-medium">{quota ? `${formatBytes(quota.used)} di ${formatBytes(quota.total)}` : "N/D"}</p>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{data.conteggi.sincronizzati} sincronizzati</Badge>
            {data.conteggi.in_elaborazione > 0 && <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{data.conteggi.in_elaborazione} in elaborazione</Badge>}
            {data.conteggi.conflitti > 0 && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />{data.conteggi.conflitti} conflitti</Badge>}
            {data.conteggi.errori > 0 && <Badge variant="destructive">{data.conteggi.errori} errori</Badge>}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            <FolderOpen className="mr-2 h-4 w-4" />{configurato ? "Cambia cartella" : "Scegli cartella"}
          </Button>
          <Button onClick={() => pull.mutate({})} disabled={!configurato || sospesa || pull.isPending}>
            {pull.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizza ora
          </Button>
          {configurato && (sospesa ? (
            <Button variant="outline" onClick={() => resume.mutate({})} disabled={resume.isPending}>
              <Play className="mr-2 h-4 w-4" />Riprendi
            </Button>
          ) : (
            <Button variant="outline" onClick={() => suspend.mutate({})} disabled={suspend.isPending}>
              <Pause className="mr-2 h-4 w-4" />Sospendi
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setLogOpen(true)}>
            <History className="mr-2 h-4 w-4" />Registro attività
          </Button>
        </div>

        {!configurato && (
          <p className="text-xs text-muted-foreground">
            Scegli la cartella OneDrive da tenere sincronizzata con l'archivio documenti. I file esistenti non vengono spostati né cancellati: la prima sincronizzazione li indicizza soltanto.
          </p>
        )}
      </CardContent>

      <FolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(id, path) => configure.mutate({ rootFolderId: id, rootFolderPath: path })}
      />

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-h-[90dvh] flex flex-col">
          <DialogHeader><DialogTitle>Registro sincronizzazione</DialogTitle></DialogHeader>
          <div className="flex-1 max-h-[60dvh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="space-y-2">
              {(eventi ?? []).map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  {ev.stato === "errore"
                    ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{EVENTO_LABEL[ev.tipo_evento] ?? ev.tipo_evento}</p>
                    {ev.dettagli?.nome && <p className="truncate text-xs text-muted-foreground">{ev.dettagli.nome}</p>}
                    {ev.errore && <p className="text-xs text-destructive break-words">{ev.errore}</p>}
                    <p className="text-xs text-muted-foreground">{formatData(ev.created_at)}</p>
                  </div>
                </div>
              ))}
              {(!eventi || eventi.length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">Nessuna attività registrata</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
