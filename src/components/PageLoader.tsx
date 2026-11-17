import { PageSkeleton } from "@/components/ui/page-skeleton";

/**
 * Fallback mostrato da <Suspense> mentre il chunk JS di una pagina
 * caricata con React.lazy() viene scaricato (vedi App.tsx).
 * Sagoma generica di pagina al posto dello spinner.
 */
export function PageLoader() {
  return <PageSkeleton className="w-full p-4 pt-6 lg:p-8" />;
}
