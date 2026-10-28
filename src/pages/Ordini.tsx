import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
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
  ListChecks,
  X,
} from "lucide-react";
import {
  useOrdini,
  useOrdiniValoreMoM,
  useCreateOrdine,
  useUpdateOrdineStatus,
  useConfermaOrdineDaStandBy,
  useBulkSetVerificatoConferma,
  useBulkUpdateOrdiniStatus,
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
import { DashCard } from "@/components/dashboard/modern/DashCard";
import { OrdiniSelectionBar } from "@/components/ordini/OrdiniSelectionBar";
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
import { exportOrdiniToCSV } from "@/lib/exportOrdiniCsv";
import { usePeriodoFiltro, usePrimoAnnoOrdini } from "@/hooks/usePeriodoFiltro";
import { isDefaultPeriodo, periodoLabel } from "@/lib/periodFilter";
import { OrderAudit } from "@/components/metrics/OrderAudit";

const Ordini = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ordine["status"] | "tutti">("tutti");
  const { periodo, setPeriodo, resetPeriodo } = usePeriodoFiltro();
  const { data: primoAnno } = usePrimoAnnoOrdini();
  const [clienteFilter, setClienteFilter] = useState("");
  const [aziendaFilter, setAziendaFilter] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrdine, setEditingOrdine] = useState<Ordine | null>(null);
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);
  const [isImportPDFOpen, setIsImportPDFOpen] = useState(false);
  const [isMultiImportOpen, setIsMultiImportOpen] = useState(false);
  const [standByTarget, setStandByTarget] = useState<{ id: string; codice?: string } | null>(null);
  const [confermaTarget, setConfermaTarget] = useState<{ id: string; codice?: string } | null>(null);

  // Selezione multipla
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<null | "verifica" | "annulla">(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Apertura automatica da azione rapida globale (FAB "+" nel layout): arriva
  // come /ordini?nuovo=1, apre la scheda e ripulisce l'URL.
  useEffect(() => {
    if (searchParams.get("cliente") || searchParams.get("azienda")) {
      setClienteFilter(searchParams.get("cliente") || "");setAziendaFilter(searchParams.get("azienda") || "");setStatusFilter("tutti");
      if(searchParams.get("storico")==="1")setPeriodo({kind:"year",year:new Date().getFullYear()});
    }
    if (searchParams.get("ricerca")) {
      setSearchTerm(searchParams.get("ricerca") ?? "");
      const year = Number(searchParams.get("anno"));
      if (Number.isInteger(year) && year > 1900) setPeriodo({ kind: "year", year });
      else resetPeriodo();
      setStatusFilter("tutti");
      setClienteFilter("");
      setAziendaFilter("");
      const next = new URLSearchParams(searchParams);
      next.delete("ricerca");
      next.delete("anno");
      setSearchParams(next, { replace: true });
    }
    if (searchParams.get("nuovo") === "1") {
      setIsDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("nuovo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: ordini, isLoading, isError, refetch } = useOrdini(searchTerm, statusFilter);
  const { data: mom } = useOrdiniValoreMoM();
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: allProdotti, refetch: refetchProdotti } = useProdotti();
  const { data: brands } = useBrands();
  const createOrdine = useCreateOrdine();
  const createRigheBatch = useCreateOrdineRigheBatch();
  const updateStatus = useUpdateOrdineStatus();
  const confermaStandBy = useConfermaOrdineDaStandBy();
  const bulkSetVerificato = useBulkSetVerificatoConferma();
  const bulkUpdateStatus = useBulkUpdateOrdiniStatus();

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
      ordine_id: ordine.id,
      azienda_id: ordine.azienda_id,
      codice: ordine.codice || `ORD-${ordine.id.slice(0, 8)}`,
      created_at: ordine.created_at,
      data_ordine: ordine.data_ordine,
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

  // Filtri Cliente/Azienda/Periodo: si combinano in AND con ricerca e stato.
  // Elenco e riepiloghi derivano sempre da questo stesso insieme filtrato.
  // Il periodo si applica su data_ordine (fallback created_at) confrontando
  // direttamente anno/mese della stringa ISO: nessuno slittamento di fuso.
  const ordiniFiltrati = useMemo(() => {
    const prefix =
      periodo.kind === "year"
        ? `${periodo.year}-`
        : `${periodo.year}-${String(periodo.month).padStart(2, "0")}-`;
    return (ordini || []).filter(
      (o) =>
        (!clienteFilter || o.cliente_id === clienteFilter) &&
        (!aziendaFilter || o.azienda_id === aziendaFilter) &&
        (searchParams.get('storico')==='1' || (o.data_ordine || o.created_at || "").startsWith(prefix))
    );
  }, [ordini, clienteFilter, aziendaFilter, periodo, searchParams]);

  // Sezioni per stato
  const ordiniAttivi = useMemo(
    () => ordiniFiltrati.filter((o) => o.status !== "annullato" && o.status !== "stand_by"),
    [ordiniFiltrati]
  );
  const ordiniStandBy = useMemo(() => ordiniFiltrati.filter((o) => o.status === "stand_by"), [ordiniFiltrati]);
  const ordiniAnnullati = useMemo(() => ordiniFiltrati.filter((o) => o.status === "annullato"), [ordiniFiltrati]);

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

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "tutti" ||
    !isDefaultPeriodo(periodo) ||
    clienteFilter !== "" ||
    aziendaFilter !== "";
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("tutti");
    resetPeriodo();
    setClienteFilter("");
    setAziendaFilter("");
  };

  // Intestazione di contesto: rende evidente a quali ordini si riferiscono
  // elenco e riepiloghi ("Fatturato · Calonaci · Casoni Liquori").
  const clienteNome = clienteFilter ? clienti?.find((c) => c.id === clienteFilter)?.nome : null;
  const aziendaNome = aziendaFilter ? aziende?.find((a) => a.id === aziendaFilter)?.nome : null;
  const contestoLabel = hasActiveFilters
    ? ["Fatturato", clienteNome, aziendaNome, periodoLabel(periodo)].filter(Boolean).join(" · ")
    : null;

  // Selezione multipla: "visibili" = tutti gli ordini che passano i filtri
  // correnti (attivi + stand-by + annullati insieme, stessa fonte filtrata).
  const totalVisibile = ordiniFiltrati.length;
  const selectedOrdini = useMemo(
    () => ordiniFiltrati.filter((o) => selectedIds.has(o.id)),
    [ordiniFiltrati, selectedIds]
  );
  const excludedAnnullatiCount = selectedOrdini.filter((o) => o.status === "annullato").length;
  const idsDaVerificare = selectedOrdini.filter((o) => o.status !== "annullato").map((o) => o.id);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleDay = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(ordiniFiltrati.map((o) => o.id)));
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const executeVerify = async () => {
    setConfirmAction(null);
    const result = await bulkSetVerificato.mutateAsync(idsDaVerificare);
    if (result.failedIds.length > 0) {
      toast.error(
        `${result.updatedCount} ordini segnati come verificati, ma ${result.failedIds.length} non sono stati aggiornati (permessi insufficienti o ordine non più presente).`
      );
    } else {
      toast.success(
        `${result.updatedCount} ordini segnati come verificati` +
          (excludedAnnullatiCount > 0 ? ` · ${excludedAnnullatiCount} annullati esclusi` : "")
      );
    }
    exitSelectionMode();
  };

  const executeCancelSelected = async () => {
    setConfirmAction(null);
    const result = await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status: "annullato" });
    if (result.failedIds.length > 0) {
      toast.error(`${result.updatedCount} ordini annullati, ${result.failedIds.length} non aggiornati.`);
    } else {
      toast.success(`${result.updatedCount} ordini annullati.`);
    }
    exitSelectionMode();
  };

  const executeWaitSelected = async () => {
    const result = await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status: "in_attesa" });
    if (result.failedIds.length > 0) {
      toast.error(`${result.updatedCount} ordini messi in attesa, ${result.failedIds.length} non aggiornati.`);
    } else {
      toast.success(`${result.updatedCount} ordini messi in attesa.`);
    }
    exitSelectionMode();
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Direzione "Scatto": pannello con scope proprio (token --scatto-*,
            non tocca il tema globale dell'app). */}
        <div className={`space-y-6 rounded-2xl bg-scatto-bg p-4 lg:p-6 ${selectionMode ? "pb-40 lg:pb-32" : ""}`}>
          {/* Intestazione */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-scatto-ink">Ordini</h1>
              <p className="text-sm text-scatto-muted">
                {isLoading ? "Caricamento…" : (
                  <>
                    <span className="font-semibold tabular-nums text-scatto-ink">{ordiniFiltrati.length}</span> ordini
                    {contestoLabel ? <> · {contestoLabel}</> : null}
                  </>
                )}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                aria-label={selectionMode ? "Esci da selezione" : "Seleziona ordini"}
                title={selectionMode ? "Esci da selezione" : "Seleziona ordini"}
                className={`h-11 w-11 shrink-0 rounded-lg border-scatto-line text-scatto-ink hover:bg-scatto-bg ${selectionMode ? "bg-scatto-accent/10" : "bg-scatto-surface"}`}
                onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
              >
                {selectionMode ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 shrink-0 gap-2 rounded-lg border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg">
                    <Upload className="h-4 w-4" />
                    <span>Importa</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-scatto-line bg-scatto-surface text-scatto-ink">
                  <DropdownMenuItem onClick={() => setIsMultiImportOpen(true)} className="min-h-11 focus:bg-scatto-bg focus:text-scatto-ink">
                    Carica più file ordini
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsImportPDFOpen(true)} className="min-h-11 focus:bg-scatto-bg focus:text-scatto-ink">
                    Importa singolo PDF/Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="h-11 flex-1 gap-2 rounded-lg bg-scatto-accent font-semibold text-white hover:bg-scatto-accent/90 sm:flex-none sm:px-5"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Nuovo ordine
              </Button>
            </div>
          </div>

          <OrdiniFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            minYear={primoAnno ?? new Date().getFullYear()}
            clienteFilter={clienteFilter}
            onClienteFilterChange={setClienteFilter}
            aziendaFilter={aziendaFilter}
            onAziendaFilterChange={setAziendaFilter}
            clienteOptions={(clienti || []).map((c) => ({
              value: c.id,
              label: c.nome,
              searchTerms: c.azienda ? [c.azienda] : undefined,
            }))}
            aziendaOptions={(aziende || []).map((a) => ({ value: a.id, label: a.nome }))}
            onReset={hasActiveFilters ? resetFilters : undefined}
          />

          <OrdiniStatsRow stats={stats} mom={mom} isLoading={isLoading} />

          <DashCard title="Ordini attivi" icon={<ShoppingCart className="h-4 w-4" />} bodyClassName="p-3 sm:p-4">
          <OrdiniList
            rows={attiviRows}
            isLoading={isLoading}
            isError={isError}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleDay={toggleDay}
            onRetry={() => refetch()}
            emptyState={
              hasActiveFilters
                ? {
                    icon: SearchX,
                    title: "Nessun ordine trovato con i filtri selezionati",
                    description: "Prova a modificare ricerca, cliente, azienda, stato o periodo.",
                    actionLabel: "Azzera filtri",
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
          </DashCard>

          {ordiniStandBy.length > 0 && (
            <DashCard
              title={`Ordini in Stand-by (${ordiniStandBy.length})`}
              icon={<PauseCircle className="h-4 w-4" />}
              bodyClassName="space-y-3 p-3 sm:p-4"
            >
              <p className="text-xs text-scatto-muted">
                Valore sospeso (non in KPI): {formatCurrency(stats.valoreStandBy)}
              </p>
              <OrdiniList
                rows={standByRows}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleDay={toggleDay}
              />
            </DashCard>
          )}

          {ordiniAnnullati.length > 0 && (
            <DashCard
              title={`Ordini annullati (${ordiniAnnullati.length})`}
              icon={<Ban className="h-4 w-4" />}
              bodyClassName="space-y-3 p-3 sm:p-4"
            >
              <p className="text-xs text-scatto-muted">Valore perso: {formatCurrency(stats.valoreAnnullato)}</p>
              <OrdiniList
                rows={annullatiRows}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleDay={toggleDay}
              />
            </DashCard>
          )}
          <details className="min-w-0 rounded-xl border border-scatto-line bg-scatto-surface px-4">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-scatto-ink">Controllo dati del periodo e dei filtri attivi</summary>
            <div className="pb-4"><OrderAudit ids={ordiniFiltrati.map(o => o.id)} /></div>
          </details>
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

        {selectionMode && (
          <OrdiniSelectionBar
            count={selectedIds.size}
            totalVisible={totalVisibile}
            allSelected={selectedIds.size > 0 && selectedIds.size === totalVisibile}
            onSelectAll={selectAllVisible}
            onCancel={exitSelectionMode}
            onVerify={() => setConfirmAction("verifica")}
            onWait={executeWaitSelected}
            onCancelOrders={() => setConfirmAction("annulla")}
            onExportCSV={() => exportOrdiniToCSV(selectedOrdini)}
            onExportPDF={async () => {
              const { exportOrdiniToPDF } = await import("@/lib/exportOrdiniPdf");
              exportOrdiniToPDF(selectedOrdini);
            }}
            pending={bulkSetVerificato.isPending || bulkUpdateStatus.isPending}
          />
        )}

        <AlertDialog open={confirmAction === "verifica"} onOpenChange={(v) => !v && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Segnare {idsDaVerificare.length} ordini come verificati?</AlertDialogTitle>
              <AlertDialogDescription>
                {excludedAnnullatiCount > 0
                  ? `${idsDaVerificare.length} ordini diventeranno verificati. ${excludedAnnullatiCount} ordini annullati tra quelli selezionati vengono esclusi automaticamente.`
                  : `${idsDaVerificare.length} ordini selezionati diventeranno verificati.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={executeVerify}>Conferma</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmAction === "annulla"} onOpenChange={(v) => !v && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annullare {selectedIds.size} ordini?</AlertDialogTitle>
              <AlertDialogDescription>
                Gli ordini selezionati passeranno allo stato Annullato. Puoi riattivarli singolarmente in seguito.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Indietro</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeCancelSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Annulla ordini
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Ordini;
