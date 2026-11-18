import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProdotto } from "@/hooks/useProdotti";

type Target = { id: string; nome: string };

/**
 * Eliminazione prodotto con conferma e protezione da doppio tocco.
 * Ogni richiesta riguarda solo l'id del prodotto scelto; mentre una richiesta
 * per quell'id è in corso, altri tocchi vengono ignorati.
 */
export function useEliminaProdotto() {
  const del = useDeleteProdotto();
  const [target, setTarget] = useState<Target | null>(null);
  const [inCorso, setInCorso] = useState<Set<string>>(() => new Set());
  const inCorsoRef = useRef(new Set<string>());

  const richiedi = useCallback((p: Target) => {
    if (inCorsoRef.current.has(p.id)) return;
    setTarget(p);
  }, []);

  const conferma = useCallback(() => {
    const p = target;
    setTarget(null);
    if (!p || inCorsoRef.current.has(p.id)) return;
    inCorsoRef.current.add(p.id);
    setInCorso(new Set(inCorsoRef.current));
    del.mutate(p.id, {
      onSettled: () => {
        inCorsoRef.current.delete(p.id);
        setInCorso(new Set(inCorsoRef.current));
      },
    });
  }, [target, del]);

  const dialog = (
    <AlertDialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare questo prodotto?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            «{target?.nome}» va nel cestino e sparisce dal catalogo. Gli ordini già registrati che lo contengono
            restano invariati (righe, descrizioni e importi).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={conferma} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { richiedi, inCorso, dialog };
}
