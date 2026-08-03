import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Upload,
  FileText,
  Edit,
  CheckCircle2,
  FileCheck2,
  PauseCircle,
  PlayCircle,
  Ban,
  RotateCcw,
  ShoppingCart,
  SearchX,
  Clock,
} from "lucide-react";
import {
  useOrdini,
  useOrdiniValoreMoM,
  useCreateOrdine,
  useUpdateOrdineStatus,
  useConfermaOrdineDaStandBy,
  type Ordine,
} from "@/hooks/useOrdini";
import { useCreateOrdineRigheBatch } from "@/hooks/useOrdiniRighe";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti } from "@/hooks/useProdotti";
import { useBrands } from "@/hooks/useBrands";
import { supabase } from "@/integrations/supabase/client";
import { OrdiniStatsRow } from "@/components/ordini/OrdiniStatsRow";
import { OrdiniFilters } from "@/components/ordini/OrdiniFilters";
import { OrdiniList } from "@/components/ordini/OrdiniList";
import type { OrdiniTableRow } from "@/components/ordini/ordiniShared";
import type { OrdineCardAction } from "@/components/ordini/OrdineCard";
import { NuovoOrdineDialog } from "@/components/ordini/NuovoOrdineDialog";
import { ModificaOrdineDialog } from "@/components/ordini/ModificaOrdineDialog";
import { ProformaDialog, type ProformaData } from "@/components/ordini/ProformaDialog";
import { ImportPDFDialog } from "@/components/ordini/ImportPDFDialog";
import { MultiFileImportDialog } from "@/components/ordini/MultiFileImportDialog";
import { StandByDialog } from "@/components/ordini/StandByDialog";
import { ConfermaOrdineDialog } from "@/components/ordini/ConfermaOrdineDialog";
import { formatCurrency } from "@/components/ordini/ordiniShared";

const Ordini = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ordine["status"] | "tutti">("tutti");
  const [monthFilters, setMonthFilters] = useState<string[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrdine, setEditingOrdine] = useState<Ordine | null>(null);
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);
  const [isImportPDFOpen, setIsImportPDFOpen] = useState(false);
  const [isMultiImportOpen, setIsMultiImportOpen] = useState(false);
  const [standByTarget, setStandByTarget] = useState<{ id: string; codice?: string } | null>(null);
  const [confermaTarget, setConfermaTarget] = useState<{ id: string; codice?: string } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Apertura automatica da azione rapida globale (FAB "+" nel layout): arriva
  // come /ordini?nuovo=1, apre la scheda e ripulisce l'URL.
  useEffect(() => {
    if (searchParams.get("nuovo") === "1") {
      setIsDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("nuovo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: ordini, isLoading, isError, refetch } = useOrdini(searchTerm, statusFilter, monthFilters);
  const { data: mom } = useOrdiniValoreMoM();
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: allProdotti, refetch: refetchProdotti } = useProdotti();
  const { data: brands } = useBrands();
  const createOrdine = useCreateOrdine();
  const createRigheBatch = useCreateOrdineRigheBatch();
  const updateStatus = useUpdateOrdineStatus();
  const confermaStandBy = useConfermaOrdineDaStandBy();

  const openEditDialog = (ordine: Ordine) => {
    setEditingOrdine(ordine);
    setIsEditDialogOpen(true);
  };

  // Recupera le righe di un ordine esistente per mostrarne la proforma
  const handleShowProforma = async (ordine: Ordine) => {
    const cliente = clienti?.find((c) => c.id === ordine.cliente_id);
    const azienda = aziende?.find((a) => a.id === ordine.azienda_id);

    const { data: righeData } = await supabase
      .from("ordini_righe")
      .select(`
        *,
        prodotti (nome, codice, pezzi_per_cartone, brand_id)
      `)
      .eq("ordine_id", ordine.id);

    setProformaData({
      codice: ordine.codice || `ORD-${ordine.id.slice(0, 8)}`,
      created_at: ordine.created_at,
      cliente_nome: cliente?.nome || ordine.clienti?.nome || "N/A",
      cliente_indirizzo: cliente?.indirizzo || undefined,
      cliente_citta: cliente?.citta || undefined,
      cliente_cap: cliente?.cap || undefined,
      cliente_piva: cliente?.partita_iva || undefined,
      azienda_nome: azienda?.nome || ordine.aziende?.nome || "N/A",
      azienda_indirizzo: azienda?.indirizzo || undefined,
      azienda_citta: azienda?.citta || undefined,
      tipo_pagamento: ordine.tipo_pagamento || "Contanti",
      sconto: Number(ordine.sconto) || 0,
      sconto_merce: Number(ordine.sconto_merce) || 0,
      totale: Number(ordine.totale),
      note: ordine.note || undefined,
      righe: (righeData || []).map((r: any) => {
        const brandName = brands?.find((b) => b.id === r.prodotti?.brand_id)?.name;
        return {
          prodotto_codice: r.prodotti?.codice || undefined,
          prodotto_nome: r.prodotti?.nome || "Prodotto",
          prodotto_brand: brandName,
          prezzo_unitario: Number(r.prezzo_unitario),
          quantita_pezzi: r.quantita_pezzi,
          quantita_cartoni: r.quantita_cartoni,
          pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
          sc1: Number(r.sc1) || 0,
          sc2: Number(r.sc2) || 0,
          sc3: Number(r.sc3) || 0,
          is_omaggio: !!r.is_omaggio,
        };
      }),
    });
    setIsProformaOpen(true);
  };

  // Sezioni per stato
  const ordiniAttivi = useMemo(
    () => ordini?.filter((o) => o.status !== "annullato" && o.status !== "stand_by") || [],
    [ordini]
  );
  const ordiniStandBy = useMemo(() => ordini?.filter((o) => o.status === "stand_by") || [], [ordini]);
  const ordiniAnnullati = useMemo(() => ordini?.filter((o) => o.status === "annullato") || [], [ordini]);

  const stats = {
    totale: ordiniAttivi.length,
    inAttesa: ordiniAttivi.filter((o) => o.status === "in_attesa").length,
    completati: ordiniAttivi.filter((o) => o.status === "completato").length,
    daVerificare: ordiniAttivi.filter((o) => o.status === "completato" && !o.verificato_conferma).length,
    valoreTotale: ordiniAttivi.reduce((sum, o) => sum + Number(o.totale), 0),
    annullati: ordiniAnnullati.length,
    valoreAnnullato: ordiniAnnullati.reduce((sum, o) => sum + Number(o.totale), 0),
    standBy: ordiniStandBy.length,
    valoreStandBy: ordiniStandBy.reduce((sum, o) => sum + Number(o.totale), 0),
  };

  // Azioni per riga, condivise fra vista mobile (card) e desktop (tabella)
  const buildAttiviActions = (ordine: Ordine): OrdineCardAction[] => [
    { label: "Visualizza Proforma", icon: FileText, onClick: () => handleShowProforma(ordine) },
    { label: "Modifica Ordine", icon: Edit, onClick: () => openEditDialog(ordine) },
    {
      label: "Segna come Completato",
      icon: CheckCircle2,
      onClick: () => updateStatus.mutate({ id: ordine.id, status: "completato" }),
    },
    {
      label: "Conferma Ordine",
      icon: FileCheck2,
      onClick: () => setConfermaTarget({ id: ordine.id, codice: ordine.codice }),
    },
    {
      label: "Metti in attesa",
      icon: Clock,
      onClick: () => updateStatus.mutate({ id: ordine.id, status: "in_attesa" }),
    },
    {
      label: "Metti in Stand-by",
      icon: PauseCircle,
      onClick: () => setStandByTarget({ id: ordine.id, codice: ordine.codice }),
    },
    {
      label: "Annulla",
      icon: Ban,
      destructive: true,
      onClick: () => updateStatus.mutate({ id: ordine.id, status: "annullato" }),
    },
  ];

  const buildStandByActions = (ordine: Ordine): OrdineCardAction[] => [
    { label: "Visualizza Proforma", icon: FileText, onClick: () => handleShowProforma(ordine) },
    { label: "Modifica", icon: Edit, onClick: () => openEditDialog(ordine) },
    {
      label: "Conferma Ordine",
      icon: FileCheck2,
      onClick: () => setConfermaTarget({ id: ordine.id, codice: ordine.codice }),
    },
    {
      label: "Annulla ordine",
      icon: Ban,
      destructive: true,
      onClick: () => updateStatus.mutate({ id: ordine.id, status: "annullato" }),
    },
  ];

  const buildAnnullatiActions = (ordine: Ordine): OrdineCardAction[] => [
    { label: "Visualizza Proforma", icon: FileText, onClick: () => handleShowProforma(ordine) },
    {
      label: "Conferma Ordine",
      icon: FileCheck2,
      onClick: () => setConfermaTarget({ id: ordine.id, codice: ordine.codice }),
    },
    {
      label: "Riattiva Ordine",
      icon: RotateCcw,
      onClick: () => updateStatus.mutate({ id: ordine.id, status: "in_attesa" }),
    },
  ];

  const attiviRows: OrdiniTableRow[] = ordiniAttivi.map((ordine) => ({
    ordine,
    actions: buildAttiviActions(ordine),
  }));

  const standByRows: OrdiniTableRow[] = ordiniStandBy.map((ordine) => ({
    ordine,
    actions: buildStandByActions(ordine),
    giorniInStandBy: ordine.stand_by_data_inizio
      ? Math.floor((Date.now() - new Date(ordine.stand_by_data_inizio).getTime()) / 86400000)
      : 0,
    primaryAction: {
      label: "Conferma",
      icon: PlayCircle,
      onClick: () => confermaStandBy.mutate({ id: ordine.id }),
      pending: confermaStandBy.isPending,
    },
  }));

  const annullatiRows: OrdiniTableRow[] = ordiniAnnullati.map((ordine) => ({
    ordine,
    muted: true,
    actions: buildAnnullatiActions(ordine),
  }));

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== "tutti" || monthFilters.length > 0;
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("tutti");
    setMonthFilters([]);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Direzione "Scatto": pannello con scope proprio (token --scatto-*,
            non tocca il tema globale dell'app). */}
        <div className="space-y-6 rounded-2xl bg-scatto-bg p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-scatto-ink">Ordini</h1>
              <p className="text-sm text-scatto-muted">Crea e gestisci gli ordini dei tuoi clienti</p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Importa</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-scatto-line bg-scatto-surface text-scatto-ink">
                  <DropdownMenuItem
                    onClick={() => setIsMultiImportOpen(true)}
                    className="focus:bg-scatto-bg focus:text-scatto-ink"
                  >
                    Carica più file ordini
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsImportPDFOpen(true)}
                    className="focus:bg-scatto-bg focus:text-scatto-ink"
                  >
                    Importa singolo PDF/Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="gap-2 rounded-xl bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Ordine</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </div>
          </div>

          <OrdiniStatsRow stats={stats} mom={mom} isLoading={isLoading} />

          <OrdiniFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            monthFilters={monthFilters}
            onMonthFiltersChange={setMonthFilters}
          />

          <OrdiniList
            rows={attiviRows}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            emptyState={
              hasActiveFilters
                ? {
                    icon: SearchX,
                    title: "Nessun ordine corrisponde ai filtri",
                    description: "Prova a modificare ricerca, stato o mese selezionato.",
                    actionLabel: "Rimuovi filtri",
                    onAction: resetFilters,
                  }
                : {
                    icon: ShoppingCart,
                    title: "Nessun ordine questo mese",
                    description: "Crea il tuo primo ordine per iniziare.",
                    actionLabel: "Crea ordine",
                    onAction: () => setIsDialogOpen(true),
                  }
            }
          />

          {ordiniStandBy.length > 0 && (
            <div className="space-y-3 border-t border-scatto-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <PauseCircle className="h-5 w-5 text-scatto-warning" />
                <h2 className="text-base font-bold text-scatto-ink">Ordini in Stand-by ({ordiniStandBy.length})</h2>
                <span className="text-sm text-scatto-muted">
                  Valore sospeso (non in KPI): {formatCurrency(stats.valoreStandBy)}
                </span>
              </div>
              <OrdiniList rows={standByRows} />
            </div>
          )}

          {ordiniAnnullati.length > 0 && (
            <div className="space-y-3 border-t border-scatto-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Ban className="h-5 w-5 text-scatto-danger" />
                <h2 className="text-base font-bold text-scatto-ink">Ordini Annullati ({ordiniAnnullati.length})</h2>
                <span className="text-sm text-scatto-muted">Valore perso: {formatCurrency(stats.valoreAnnullato)}</span>
              </div>
              <OrdiniList rows={annullatiRows} />
            </div>
          )}
        </div>

        <NuovoOrdineDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onOrderCreated={(data) => {
            setProformaData(data);
            setIsProformaOpen(true);
          }}
        />

        <ModificaOrdineDialog
          ordine={editingOrdine}
          open={isEditDialogOpen}
          onOpenChange={(v) => {
            setIsEditDialogOpen(v);
            if (!v) setEditingOrdine(null);
          }}
        />

        <ProformaDialog open={isProformaOpen} onOpenChange={setIsProformaOpen} data={proformaData} />

        <ImportPDFDialog
          open={isImportPDFOpen}
          onOpenChange={setIsImportPDFOpen}
          clienti={clienti || []}
          aziende={aziende || []}
          prodotti={allProdotti || []}
          onProductsCreated={() => refetchProdotti()}
          onImportComplete={async (data) => {
            try {
              const ordine = await createOrdine.mutateAsync({
                cliente_id: data.cliente_id,
                azienda_id: data.azienda_id,
                prodotti: data.righe.reduce((sum, r) => sum + r.quantita_pezzi + r.quantita_cartoni, 0),
                totale: data.totale,
                note: data.note || undefined,
                sconto: data.sconto,
                sconto_merce: data.sconto_merce,
                tipo_pagamento: data.tipo_pagamento,
                data_ordine: data.data_ordine,
              });

              await createRigheBatch.mutateAsync(
                data.righe.map((riga) => ({
                  ordine_id: ordine.id,
                  prodotto_id: riga.prodotto_id,
                  quantita_pezzi: riga.quantita_pezzi,
                  quantita_cartoni: riga.quantita_cartoni,
                  prezzo_unitario: riga.prezzo_unitario,
                  sc1: 0,
                  sc2: 0,
                  sc3: 0,
                }))
              );
            } catch (error) {
              console.error("Error importing order:", error);
            }
          }}
        />

        <MultiFileImportDialog
          open={isMultiImportOpen}
          onOpenChange={setIsMultiImportOpen}
          clienti={clienti || []}
          aziende={aziende || []}
          prodotti={allProdotti || []}
          onProductsCreated={() => refetchProdotti()}
          onCreateOrder={async (data) => {
            const ordine = await createOrdine.mutateAsync({
              cliente_id: data.cliente_id,
              azienda_id: data.azienda_id,
              prodotti: data.righe.reduce((s, r) => s + r.quantita_cartoni, 0),
              totale: data.totale,
              note: data.note || undefined,
              sconto: data.sconto,
              sconto_merce: data.sconto_merce,
              tipo_pagamento: data.tipo_pagamento,
              data_ordine: data.data_ordine,
            });
            await createRigheBatch.mutateAsync(
              data.righe.map((r) => ({
                ordine_id: ordine.id,
                prodotto_id: r.prodotto_id,
                quantita_pezzi: 0,
                quantita_cartoni: r.quantita_cartoni,
                prezzo_unitario: r.prezzo_unitario,
                sc1: r.sc1 || 0,
                sc2: r.sc2 || 0,
                sc3: r.sc3 || 0,
              }))
            );
          }}
        />

        <StandByDialog
          open={!!standByTarget}
          onOpenChange={(v) => {
            if (!v) setStandByTarget(null);
          }}
          ordineId={standByTarget?.id || null}
          ordineCodice={standByTarget?.codice}
        />

        <ConfermaOrdineDialog
          open={!!confermaTarget}
          onOpenChange={(v) => {
            if (!v) setConfermaTarget(null);
          }}
          ordineId={confermaTarget?.id || null}
          ordineCodice={confermaTarget?.codice}
        />
      </div>
    </MainLayout>
  );
};

export default Ordini;
