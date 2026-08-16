import { useParams } from "react-router-dom";
import { useAziende } from "@/hooks/useAziende";
import Analytics from "./Analytics";

/**
 * Sottopagina Analytics dedicata a una singola azienda: stessa pagina
 * Analytics con il filtro fornitore bloccato sull'azienda della rotta.
 * Ogni nuova azienda creata compare automaticamente qui e nel menu.
 */
const AnalyticsAzienda = () => {
  const { id } = useParams<{ id: string }>();
  const { data: aziende } = useAziende();
  const azienda = (aziende || []).find((a) => a.id === id);

  return (
    <Analytics
      key={id}
      lockedAziendaId={id}
      title={azienda ? `Analytics · ${azienda.nome}` : "Analytics azienda"}
      description="Solo i dati di questa azienda: fatturato, clienti, marchi e prodotti"
    />
  );
};

export default AnalyticsAzienda;
