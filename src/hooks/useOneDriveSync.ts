import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

export type OneDriveStatus = {
  drive: { id: string; name: string; type: string; email: string | null; quota: { used: number; total: number; remaining: number } | null };
  state: {
    id: string; root_folder_id: string | null; root_folder_path: string | null;
    stato: "attiva" | "sospesa" | "errore"; ultima_sync_at: string | null; ultimo_esito: string | null;
    documenti_sincronizzati: number;
  } | null;
  conteggi: { sincronizzati: number; in_elaborazione: number; errori: number; conflitti: number };
};

export type OneDriveItem = { id: string; name: string; isFolder: boolean; size: number; childCount: number; modified: string | null };

export type SyncEvento = {
  id: string; documento_id: string | null; origine: string; tipo_evento: string;
  stato: string; tentativi: number; errore: string | null; created_at: string;
  dettagli: { nome?: string } | null;
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("onedrive-sync", { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(details || "Operazione OneDrive non riuscita");
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useOneDriveStatus() {
  return useQuery({
    queryKey: ["onedrive-status"],
    queryFn: () => invoke<OneDriveStatus>({ action: "status" }),
    retry: 1,
  });
}

export function useOneDriveBrowse(folderId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["onedrive-browse", folderId],
    queryFn: () => invoke<{ items: OneDriveItem[] }>({ action: "browse", folderId }),
    enabled,
  });
}

export function useOneDriveEventi() {
  return useQuery({
    queryKey: ["onedrive-eventi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onedrive_sync_eventi")
        .select("id,documento_id,origine,tipo_evento,stato,tentativi,errore,created_at,dettagli")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SyncEvento[];
    },
  });
}

function useSyncMutation<TArgs extends Record<string, unknown>>(action: string, successMsg: string | ((r: any) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => invoke<any>({ action, ...args }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["onedrive-status"] });
      qc.invalidateQueries({ queryKey: ["onedrive-eventi"] });
      qc.invalidateQueries({ queryKey: ["documenti"] });
      toast.success(typeof successMsg === "function" ? successMsg(r) : successMsg);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOneDriveConfigure() {
  return useSyncMutation<{ rootFolderId: string | null; rootFolderPath: string }>("configure", "Cartella OneDrive collegata");
}

export function useOneDrivePull() {
  return useSyncMutation<Record<string, never>>("pull", (r) =>
    `Sincronizzazione completata: ${r.importati} nuovi, ${r.aggiornati} aggiornati, ${r.duplicati} duplicati, ${r.errori} errori`);
}

export function useOneDrivePush() {
  return useSyncMutation<{ documentoId: string }>("push", "Documento caricato su OneDrive");
}

export function useOneDriveSuspend() {
  return useSyncMutation<Record<string, never>>("suspend", "Sincronizzazione sospesa");
}

export function useOneDriveResume() {
  return useSyncMutation<Record<string, never>>("resume", "Sincronizzazione ripresa");
}
