import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Layers,
  Locate,
  Route as RouteIcon,
  Boxes,
  Flame,
  X,
  ChevronUp,
  Loader2,
  GripVertical,
  Trash2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MapCanvas, type PesoHeatmap } from "@/components/mappa/MapCanvas";
import { CustomerCard } from "@/components/mappa/CustomerCard";
import { STATO_COLORI, type MapStyleId } from "@/lib/googleMaps";
import { useMappaClienti, distanzaKm, type ClienteMappa } from "@/hooks/useMappaClienti";
import { useTheme } from "@/hooks/useTheme";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type LayerId =
  | "clienti"
  | "heatmap"
  | "da_visitare"
  | "inattivi"
  | "senza_ordini"
  | "insoluti"
  | "percorso";

const PESI: { id: PesoHeatmap; label: string }[] = [
  { id: "clienti", label: "N. clienti" },
  { id: "fatturato", label: "Fatturato" },
  { id: "ordini", label: "N. ordini" },
  { id: "scontrino", label: "Scontrino medio" },
  { id: "frequenza", label: "Frequenza" },
];

const STILI: { id: MapStyleId; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "satellite", label: "Satellite" },
  { id: "light", label: "Chiara" },
  { id: "dark", label: "Scura" },
];

const RAGGI = [5, 10, 25, 50];

export default function MappaClienti() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { clienti, isLoading, senzaCoordinate } = useMappaClienti();

  const [styleId, setStyleId] = useState<MapStyleId>(theme === "dark" ? "dark" : "standard");
  const [tridimensionale, setTridimensionale] = useState(false);
  const [pannelloAperto, setPannelloAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibili, setVisibili] = useState<string[]>([]);
  const [pesoHeatmap, setPesoHeatmap] = useState<PesoHeatmap>("fatturato");
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    clienti: true,
    heatmap: false,
    da_visitare: false,
    inattivi: false,
    senza_ordini: false,
    insoluti: false,
    percorso: false,
  });
  const [aziendaFiltro, setAziendaFiltro] = useState<string | null>(null);
  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null);
  const [raggioKm, setRaggioKm] = useState<number | null>(null);
  const [giro, setGiro] = useState<string[]>([]);
  const [percorso, setPercorso] = useState<{
    polyline: string | null;
    tappe: ClienteMappa[];
    distanzaMetri: number;
    durataSecondi: number;
    tratte: { distanzaMetri: number; durataSecondi: number }[];
  } | null>(null);
  const [calcolando, setCalcolando] = useState(false);
  const [geocodifica, setGeocodifica] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const geocodAvviata = useRef(false);

  // Geocodifica automatica dei clienti privi di coordinate.
  useEffect(() => {
    if (isLoading || geocodAvviata.current || senzaCoordinate === 0) return;
    geocodAvviata.current = true;
    setGeocodifica(true);
    (async () => {
      try {
        let restanti = senzaCoordinate;
        let giri = 0;
        while (restanti > 0 && giri < 6) {
          const { data, error } = await supabase.functions.invoke("maps-geocode", {
            body: { limit: 40 },
          });
          if (error) throw error;
          const fatti = Number(data?.geocodificati ?? 0);
          if (!fatti) break;
          restanti -= fatti;
          giri++;
        }
        await queryClient.invalidateQueries({ queryKey: ["mappa-clienti"] });
        toast.success("Posizioni clienti aggiornate sulla mappa");
      } catch {
        toast.error("Non sono riuscito a calcolare alcune posizioni dagli indirizzi");
      } finally {
        setGeocodifica(false);
      }
    })();
  }, [isLoading, senzaCoordinate, queryClient]);

  // Adatta lo stile della mappa al tema dell'app.
  useEffect(() => {
    setStyleId((cur) => (cur === "satellite" ? cur : theme === "dark" ? "dark" : "standard"));
  }, [theme]);

  const aziendeDisponibili = useMemo(() => {
    const s = new Set<string>();
    clienti.forEach((c) => c.aziende.forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [clienti]);

  const filtrati = useMemo(() => {
    return clienti.filter((c) => {
      if (layers.da_visitare && c.stato !== "a_rischio") return false;
      if (layers.inattivi && c.stato !== "inattivo") return false;
      if (layers.senza_ordini && c.stato !== "senza_ordini") return false;
      if (layers.insoluti && c.insoluto <= 0) return false;
      if (aziendaFiltro && !c.aziende.includes(aziendaFiltro)) return false;
      if (posizione && raggioKm && distanzaKm(posizione.lat, posizione.lng, c.lat, c.lng) > raggioKm)
        return false;
      return true;
    });
  }, [clienti, layers, aziendaFiltro, posizione, raggioKm]);

  const suggerimenti = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (q.length < 2) return [];
    return clienti
      .filter((c) =>
        [c.nome, c.citta, c.provincia, c.indirizzo, c.cap]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [ricerca, clienti]);

  const selezionato = useMemo(
    () => clienti.find((c) => c.id === selectedId) ?? null,
    [clienti, selectedId],
  );

  const tappeGiro = useMemo(
    () => giro.map((id) => clienti.find((c) => c.id === id)).filter(Boolean) as ClienteMappa[],
    [giro, clienti],
  );

  const clientiVisibili = useMemo(() => {
    const set = new Set(visibili);
    const base = filtrati.filter((c) => set.has(c.id));
    return (base.length ? base : filtrati).slice().sort((a, b) => b.fatturato - a.fatturato);
  }, [filtrati, visibili]);

  const totaliVisibili = useMemo(() => {
    const list = filtrati;
    return {
      clienti: list.length,
      fatturato: list.reduce((s, c) => s + c.fatturato, 0),
    };
  }, [filtrati]);

  const trovaPosizione = () => {
    if (!navigator.geolocation) {
      toast.error("Posizione non disponibile su questo dispositivo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosizione({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Posizione rilevata");
      },
      () => toast.error("Devi consentire l'accesso alla posizione"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const calcolaPercorso = async (ottimizza: boolean) => {
    if (tappeGiro.length < 1) {
      toast.error("Aggiungi almeno un cliente al giro");
      return;
    }
    const origin = posizione ?? { lat: tappeGiro[0].lat, lng: tappeGiro[0].lng };
    setCalcolando(true);
    try {
      const { data, error } = await supabase.functions.invoke("maps-route", {
        body: {
          origin,
          stops: tappeGiro.map((t) => ({ lat: t.lat, lng: t.lng })),
          ottimizza,
        },
      });
      if (error) throw error;
      let tappe = tappeGiro;
      if (ottimizza && Array.isArray(data?.ordineOttimizzato)) {
        const intermedie = tappeGiro.slice(0, -1);
        const riordinate = (data.ordineOttimizzato as number[]).map((i) => intermedie[i]);
        tappe = [...riordinate, tappeGiro[tappeGiro.length - 1]];
        setGiro(tappe.map((t) => t.id));
      }
      setPercorso({
        polyline: data?.polyline ?? null,
        tappe,
        distanzaMetri: data?.distanzaMetri ?? 0,
        durataSecondi: data?.durataSecondi ?? 0,
        tratte: data?.tratte ?? [],
      });
      setLayers((l) => ({ ...l, percorso: true }));
    } catch {
      toast.error("Non sono riuscito a calcolare il percorso");
    } finally {
      setCalcolando(false);
    }
  };

  const spostaTappa = (from: number, to: number) => {
    setGiro((g) => {
      const next = g.slice();
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
    setPercorso(null);
  };

  const toggleLayer = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));

  const aggiungiAlGiro = (id: string) => {
    setGiro((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
    setPercorso(null);
  };

  const ore = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  return (
    <MainLayout>
      <div className="relative h-[calc(100dvh-9.5rem)] w-full overflow-hidden rounded-2xl border border-border bg-muted/30 lg:h-[calc(100dvh-5rem)]">
        {isLoading ? (
          <Skeleton className="absolute inset-0" />
        ) : (
          <MapCanvas
            clienti={filtrati}
            selectedId={selectedId}
            onSelect={setSelectedId}
            styleId={styleId}
            tridimensionale={tridimensionale}
            mostraClienti={layers.clienti}
            mostraHeatmap={layers.heatmap}
            pesoHeatmap={pesoHeatmap}
            posizioneUtente={posizione}
            raggioKm={raggioKm}
            percorso={layers.percorso && percorso ? { polyline: percorso.polyline, tappe: percorso.tappe } : null}
            onVisibiliChange={setVisibili}
            onErrore={(m) => toast.error(m)}
          />
        )}

        {/* Ricerca */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
          <div className="pointer-events-auto mx-auto max-w-xl">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 shadow-md backdrop-blur-md">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <Input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca cliente, comune, provincia, CAP…"
                className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              {ricerca && (
                <button
                  onClick={() => setRicerca("")}
                  aria-label="Cancella ricerca"
                  className="touch-target rounded-lg p-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {suggerimenti.length > 0 && (
              <div className="mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {suggerimenti.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedId(s.id);
                      setRicerca("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: STATO_COLORI[s.stato].fill }}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{s.nome}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[s.citta, s.provincia].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controlli laterali */}
        <div className="absolute right-3 top-20 z-20 flex flex-col gap-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-md backdrop-blur-md">
            {STILI.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={cn(
                  "block w-full px-3 py-2 text-xs font-medium transition-colors",
                  styleId === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTridimensionale((v) => !v)}
            className={cn(
              "touch-target rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-semibold shadow-md backdrop-blur-md",
              tridimensionale && "bg-primary text-primary-foreground",
            )}
          >
            {tridimensionale ? "3D" : "2D"}
          </button>
          <button
            onClick={trovaPosizione}
            aria-label="Dove sono"
            className="touch-target rounded-xl border border-border bg-card/95 p-2.5 shadow-md backdrop-blur-md"
          >
            <Locate className={cn("h-4 w-4", posizione && "text-primary")} />
          </button>
        </div>

        {/* Indicatori in alto a sinistra */}
        <div className="absolute left-3 top-20 z-20 hidden flex-col gap-2 sm:flex">
          <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-md">
            <p className="text-[11px] text-muted-foreground">Clienti a mappa</p>
            <p className="text-lg font-bold tabular-nums leading-tight">{totaliVisibili.clienti}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {euro.format(totaliVisibili.fatturato)}
            </p>
          </div>
          {geocodifica && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calcolo posizioni…
            </div>
          )}
        </div>

        {/* Scheda cliente */}
        {selezionato && (
          <div className="absolute inset-x-3 bottom-3 z-30 sm:left-3 sm:right-auto sm:w-[380px]">
            <CustomerCard
              cliente={selezionato}
              inGiro={giro.includes(selezionato.id)}
              onChiudi={() => setSelectedId(null)}
              onAggiungiGiro={() => aggiungiAlGiro(selezionato.id)}
              onRegistraVisita={() => navigate(`/clienti/${selezionato.id}`)}
            />
          </div>
        )}

        {/* Pannello flottante: filtri, livelli, elenco, giro */}
        <div
          className={cn(
            "absolute z-30 transition-transform duration-200",
            "inset-x-0 bottom-0 sm:inset-auto sm:right-3 sm:top-20 sm:bottom-3 sm:w-[340px]",
            !pannelloAperto && "translate-y-[calc(100%-3.25rem)] sm:translate-y-0 sm:translate-x-[calc(100%+1rem)]",
          )}
        >
          <div className="flex h-full max-h-[75dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md sm:max-h-none sm:rounded-2xl">
            <button
              onClick={() => setPannelloAperto((v) => !v)}
              className="flex h-13 items-center justify-between px-4 py-3 text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> Livelli e filtri
              </span>
              <ChevronUp className={cn("h-4 w-4 transition-transform", pannelloAperto && "rotate-180")} />
            </button>

            <div
              className="min-h-0 flex-1 space-y-6 overflow-y-auto border-t border-border p-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* Livelli */}
              <section className="space-y-2">
                {[
                  { id: "clienti" as LayerId, label: "Clienti", icon: MapPin },
                  { id: "heatmap" as LayerId, label: "Heatmap", icon: Flame },
                  { id: "da_visitare" as LayerId, label: "Da ricontattare", icon: Boxes },
                  { id: "inattivi" as LayerId, label: "Clienti inattivi", icon: Boxes },
                  { id: "senza_ordini" as LayerId, label: "Senza ordini", icon: Boxes },
                  { id: "insoluti" as LayerId, label: "Insoluti", icon: Boxes },
                  { id: "percorso" as LayerId, label: "Percorso visite", icon: RouteIcon },
                ].map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3">
                    <Label htmlFor={`layer-${l.id}`} className="flex items-center gap-2 text-sm">
                      <l.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {l.label}
                    </Label>
                    <Switch
                      id={`layer-${l.id}`}
                      checked={layers[l.id]}
                      onCheckedChange={() => toggleLayer(l.id)}
                    />
                  </div>
                ))}
              </section>

              {/* Peso heatmap */}
              {layers.heatmap && (
                <section className="space-y-2">
                  <p className="text-xs text-muted-foreground">Peso heatmap</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PESI.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPesoHeatmap(p.id)}
                        className={cn(
                          "rounded-lg border border-border px-2.5 py-1 text-xs",
                          pesoHeatmap === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Aziende mandanti */}
              <section className="space-y-2">
                <p className="text-xs text-muted-foreground">Azienda mandante</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setAziendaFiltro(null)}
                    className={cn(
                      "rounded-lg border border-border px-2.5 py-1 text-xs",
                      !aziendaFiltro ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    Tutte
                  </button>
                  {aziendeDisponibili.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAziendaFiltro(a === aziendaFiltro ? null : a)}
                      className={cn(
                        "rounded-lg border border-border px-2.5 py-1 text-xs",
                        aziendaFiltro === a ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </section>

              {/* Vicino a me */}
              <section className="space-y-2">
                <p className="text-xs text-muted-foreground">Clienti vicino a me</p>
                <div className="flex flex-wrap gap-1.5">
                  {RAGGI.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        if (!posizione) trovaPosizione();
                        setRaggioKm(raggioKm === r ? null : r);
                      }}
                      className={cn(
                        "rounded-lg border border-border px-2.5 py-1 text-xs",
                        raggioKm === r ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </section>

              {/* Giro visite */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Giro visite</p>
                  {giro.length > 0 && (
                    <button
                      onClick={() => {
                        setGiro([]);
                        setPercorso(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Svuota
                    </button>
                  )}
                </div>
                {giro.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Seleziona un cliente sulla mappa e premi “Al giro” per costruire il percorso.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {tappeGiro.map((t, i) => (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={() => (dragIndex.current = i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex.current !== null && dragIndex.current !== i)
                            spostaTappa(dragIndex.current, i);
                          dragIndex.current = null;
                        }}
                        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm"
                      >
                        <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="w-4 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <button
                          onClick={() => setSelectedId(t.id)}
                          className="min-w-0 flex-1 truncate text-left"
                        >
                          {t.nome}
                        </button>
                        {percorso?.tratte?.[i] && (
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {(percorso.tratte[i].distanzaMetri / 1000).toFixed(1)} km ·{" "}
                            {Math.round(percorso.tratte[i].durataSecondi / 60)}′
                          </span>
                        )}
                        <button
                          onClick={() => aggiungiAlGiro(t.id)}
                          aria-label={`Togli ${t.nome} dal giro`}
                          className="touch-target rounded p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {giro.length > 0 && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => calcolaPercorso(false)}
                        disabled={calcolando}
                      >
                        {calcolando ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RouteIcon className="mr-1 h-3.5 w-3.5" />}
                        Pianifica giro
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => calcolaPercorso(true)}
                        disabled={calcolando}
                      >
                        <Sparkles className="mr-1 h-3.5 w-3.5" /> Ottimizza
                      </Button>
                    </div>
                    {percorso && (
                      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-semibold tabular-nums">
                          {(percorso.distanzaMetri / 1000).toFixed(1)} km
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {ore(percorso.durataSecondi)}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-[11px]">
                          {percorso.tappe.length} tappe
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Clienti visibili */}
              <section className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Clienti nell&apos;area ({clientiVisibili.length})
                </p>
                <ul className="space-y-1">
                  {clientiVisibili.slice(0, 40).map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                          selectedId === c.id && "bg-muted",
                        )}
                      >
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: STATO_COLORI[c.stato].fill }}
                        />
                        <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {euro.format(c.fatturato)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>

        {/* Apertura pannello quando chiuso (desktop) */}
        {!pannelloAperto && (
          <button
            onClick={() => setPannelloAperto(true)}
            className="absolute bottom-3 right-3 z-20 hidden touch-target items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-sm font-medium shadow-md backdrop-blur-md sm:flex"
          >
            <Layers className="h-4 w-4" /> Livelli e filtri
          </button>
        )}
      </div>
    </MainLayout>
  );
}
