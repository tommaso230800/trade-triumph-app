/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerClusterer, type Cluster } from "@googlemaps/markerclusterer";
import {
  loadGoogleMaps,
  markerIcon,
  STATO_COLORI,
  STYLE_DARK,
  STYLE_LIGHT,
  type MapStyleId,
} from "@/lib/googleMaps";
import type { ClienteMappa } from "@/hooks/useMappaClienti";

/** Il tipo HeatmapLayer non espone i metodi nei tipi ufficiali: alias minimo. */
type HeatmapLike = {
  setMap: (map: google.maps.Map | null) => void;
  setData: (data: { location: google.maps.LatLng; weight: number }[]) => void;
};
type HeatmapCtor = new (opts: Record<string, unknown>) => HeatmapLike;

export type PesoHeatmap = "clienti" | "fatturato" | "ordini" | "scontrino" | "frequenza";

export type MapCanvasProps = {
  clienti: ClienteMappa[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  styleId: MapStyleId;
  tridimensionale: boolean;
  mostraClienti: boolean;
  mostraHeatmap: boolean;
  pesoHeatmap: PesoHeatmap;
  posizioneUtente: { lat: number; lng: number } | null;
  raggioKm: number | null;
  percorso: { polyline: string | null; tappe: ClienteMappa[] } | null;
  onVisibiliChange?: (ids: string[]) => void;
  onReady?: () => void;
  onErrore?: (msg: string) => void;
};

function pesoDi(c: ClienteMappa, peso: PesoHeatmap): number {
  switch (peso) {
    case "fatturato":
      return Math.max(c.fatturato, 0);
    case "ordini":
      return c.ordiniCount;
    case "scontrino":
      return c.ordiniCount > 0 ? c.fatturato / c.ordiniCount : 0;
    case "frequenza":
      return c.giorniUltimoOrdine === null ? 0 : Math.max(0, 365 - c.giorniUltimoOrdine);
    default:
      return 1;
  }
}

export function MapCanvas({
  clienti,
  selectedId,
  onSelect,
  styleId,
  tridimensionale,
  mostraClienti,
  mostraHeatmap,
  pesoHeatmap,
  posizioneUtente,
  raggioKm,
  percorso,
  onVisibiliChange,
  onReady,
  onErrore,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const heatmapRef = useRef<HeatmapLike | null>(null);
  const routeRef = useRef<google.maps.Polyline | null>(null);
  const routeStopsRef = useRef<google.maps.Marker[]>([]);
  const meRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [pronta, setPronta] = useState(false);

  // Inizializzazione una sola volta.
  useEffect(() => {
    let annullato = false;
    loadGoogleMaps()
      .then((g) => {
        if (annullato || !containerRef.current || mapRef.current) return;
        const map = new g.maps.Map(containerRef.current, {
          center: { lat: 43.77, lng: 11.25 },
          zoom: 8,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          tilt: 0,
          heading: 0,
          maxZoom: 20,
          minZoom: 4,
        });
        mapRef.current = map;
        map.addListener("click", () => onSelect(null));
        map.addListener("idle", () => {
          if (!onVisibiliChange) return;
          const b = map.getBounds();
          if (!b) return;
          const ids: string[] = [];
          markersRef.current.forEach((m, id) => {
            const pos = m.getPosition();
            if (pos && b.contains(pos)) ids.push(id);
          });
          onVisibiliChange(ids);
        });
        setPronta(true);
        onReady?.();
      })
      .catch((e: Error) => onErrore?.(e.message));
    return () => {
      annullato = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stile cartografico e modalità 3D.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    const g = window.google;
    const satellite = styleId === "satellite" || styleId === "standard";
    map.setMapTypeId(
      styleId === "satellite" ? g.maps.MapTypeId.HYBRID : g.maps.MapTypeId.ROADMAP,
    );
    if (styleId === "dark") map.setOptions({ styles: STYLE_DARK });
    else if (styleId === "light" || styleId === "standard") map.setOptions({ styles: STYLE_LIGHT });
    else map.setOptions({ styles: [] });
    void satellite;
  }, [styleId, pronta]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    if (tridimensionale) {
      // Il rilievo 3D degli edifici è disponibile sulla vista aerea a zoom alto.
      map.setMapTypeId(window.google.maps.MapTypeId.HYBRID);
      if ((map.getZoom() ?? 0) < 17) map.setZoom(17.5);
      map.setTilt(45);
    } else {
      map.setTilt(0);
      map.setHeading(0);
    }
  }, [tridimensionale, pronta]);

  // Marker + clustering.
  const clientiKey = useMemo(
    () => clienti.map((c) => c.id).join(","),
    [clienti],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    const g = window.google;

    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    if (!mostraClienti) {
      clustererRef.current?.clearMarkers();
      return;
    }

    const markers = clienti.map((c) => {
      const colore = STATO_COLORI[c.stato]?.fill ?? "#6b7280";
      const marker = new g.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        icon: markerIcon(g.maps, colore, 30, false),
        title: c.nome,
        optimized: true,
      });
      marker.addListener("click", () => onSelect(c.id));
      marker.addListener("mouseover", () =>
        marker.setIcon(markerIcon(g.maps, colore, 34, false)),
      );
      marker.addListener("mouseout", () =>
        marker.setIcon(
          markerIcon(g.maps, colore, selectedRef.current === c.id ? 30 : 30, selectedRef.current === c.id),
        ),
      );
      markersRef.current.set(c.id, marker);
      return marker;
    });

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position, markers: cm }: Cluster) => {
            const totale = (cm ?? []).length;
            const size = Math.min(64, 34 + Math.log2(Math.max(count, 1)) * 8);
            const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#1d4ed8" opacity="0.16"/>
  <circle cx="32" cy="32" r="22" fill="#1d4ed8"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
  <text x="32" y="38" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${count}</text>
</svg>`.trim();
            void totale;
            return new window.google.maps.Marker({
              position,
              icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
                scaledSize: new window.google.maps.Size(size, size),
                anchor: new window.google.maps.Point(size / 2, size / 2),
              },
              zIndex: 10_000 + count,
            });
          },
        },
        onClusterClick: (_e, cluster, m) => {
          const bounds = cluster.bounds;
          if (bounds) m.fitBounds(bounds, 64);
        },
      });
    } else {
      clustererRef.current.addMarkers(markers);
    }
  }, [clientiKey, mostraClienti, pronta, onSelect, clienti]);

  // Evidenziazione marker selezionato + fly-to cinematico.
  useEffect(() => {
    if (!pronta) return;
    const g = window.google;
    const precedente = selectedRef.current;
    selectedRef.current = selectedId;

    if (precedente && markersRef.current.has(precedente)) {
      const c = clienti.find((x) => x.id === precedente);
      const colore = STATO_COLORI[c?.stato ?? "senza_ordini"].fill;
      markersRef.current.get(precedente)!.setIcon(markerIcon(g.maps, colore, 30, false));
    }
    if (!selectedId) return;
    const cliente = clienti.find((c) => c.id === selectedId);
    const marker = markersRef.current.get(selectedId);
    if (!cliente) return;
    if (marker) {
      marker.setIcon(markerIcon(g.maps, STATO_COLORI[cliente.stato].fill, 30, true));
      marker.setZIndex(99_999);
    }
    const map = mapRef.current;
    if (map) {
      map.panTo({ lat: cliente.lat, lng: cliente.lng });
      const z = map.getZoom() ?? 8;
      if (z < 14) window.setTimeout(() => map.setZoom(14.5), 220);
    }
  }, [selectedId, clienti, pronta]);

  // Heatmap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    const g = window.google;

    if (!mostraHeatmap) {
      heatmapRef.current?.setMap(null);
      return;
    }
    const punti = clienti.map((c) => ({
      location: new g.maps.LatLng(c.lat, c.lng),
      weight: pesoDi(c, pesoHeatmap),
    }));
    if (!heatmapRef.current) {
      const Ctor = (g.maps.visualization as unknown as { HeatmapLayer: HeatmapCtor }).HeatmapLayer;
      heatmapRef.current = new Ctor({
        data: punti,
        radius: 42,
        opacity: 0.72,
        dissipating: true,
        gradient: [
          "rgba(29,78,216,0)",
          "rgba(29,78,216,0.55)",
          "rgba(14,165,233,0.7)",
          "rgba(16,185,129,0.75)",
          "rgba(234,179,8,0.85)",
          "rgba(239,68,68,0.95)",
        ],
      });
    } else {
      heatmapRef.current.setData(punti);
    }
    heatmapRef.current.setMap(map);
  }, [clienti, mostraHeatmap, pesoHeatmap, pronta]);

  // Percorso giro visite.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    const g = window.google;

    routeRef.current?.setMap(null);
    routeRef.current = null;
    routeStopsRef.current.forEach((m) => m.setMap(null));
    routeStopsRef.current = [];

    if (!percorso || !percorso.tappe.length) return;

    if (percorso.polyline && g.maps.geometry?.encoding) {
      const path = g.maps.geometry.encoding.decodePath(percorso.polyline);
      routeRef.current = new g.maps.Polyline({
        path,
        map,
        strokeColor: "#1d4ed8",
        strokeOpacity: 0.9,
        strokeWeight: 5,
        zIndex: 5,
      });
    }

    routeStopsRef.current = percorso.tappe.map((t, i) => {
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
  <circle cx="17" cy="17" r="15" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
  <text x="17" y="23" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="15" font-weight="700" fill="#ffffff">${i + 1}</text>
</svg>`.trim();
      return new g.maps.Marker({
        position: { lat: t.lat, lng: t.lng },
        map,
        zIndex: 50_000 + i,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new g.maps.Size(34, 34),
          anchor: new g.maps.Point(17, 17),
        },
      });
    });

    const bounds = new g.maps.LatLngBounds();
    percorso.tappe.forEach((t) => bounds.extend({ lat: t.lat, lng: t.lng }));
    map.fitBounds(bounds, 80);
  }, [percorso, pronta]);

  // Posizione utente e raggio "vicino a me".
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronta) return;
    const g = window.google;

    if (!posizioneUtente) {
      meRef.current?.setMap(null);
      meRef.current = null;
      circleRef.current?.setMap(null);
      circleRef.current = null;
      return;
    }

    if (!meRef.current) {
      meRef.current = new g.maps.Marker({
        map,
        zIndex: 90_000,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
    }
    meRef.current.setPosition(posizioneUtente);

    if (raggioKm) {
      if (!circleRef.current) {
        circleRef.current = new g.maps.Circle({
          map,
          strokeColor: "#1d4ed8",
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          fillColor: "#1d4ed8",
          fillOpacity: 0.06,
        });
      }
      circleRef.current.setCenter(posizioneUtente);
      circleRef.current.setRadius(raggioKm * 1000);
      circleRef.current.setMap(map);
    } else {
      circleRef.current?.setMap(null);
    }
  }, [posizioneUtente, raggioKm, pronta]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

/** Controlli imperativi esposti alla pagina (zoom, rotazione, inquadratura). */
export function useMapControls() {
  return null;
}
