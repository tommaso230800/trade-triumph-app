import { Loader2 } from "lucide-react";

/**
 * Fallback mostrato da <Suspense> mentre il chunk JS di una pagina
 * caricata con React.lazy() viene scaricato (vedi App.tsx).
 */
export function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
