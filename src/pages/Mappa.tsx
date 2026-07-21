import { MainLayout } from "@/components/layout/MainLayout";
import { useClientiMappa, useGeocodeMissing, optimizeRoute } from "@/hooks/useMappaClienti";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route as RouteIcon, Loader2, Locate } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon (Vite bundler)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const priorityColor: Record<string, string> = {
  risk: "#ef4444", target: "#f59e0b", potential: "#3b82f6", routine: "#10b981",
};

function coloredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  });
}

export default function Mappa() {
  const { data: clienti = [], isLoading } = useClientiMappa();
  const geocode = useGeocodeMissing();
  const [start, setStart] = useState<[number, number] | null>(null);
  const [routeMode, setRouteMode] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const withCoords = clienti.filter((c) => c.latitudine && c.longitudine);
  const missing = clienti.length - withCoords.length;

  const filtered = useMemo(() => {
    if (filter === "all") return withCoords;
    return withCoords.filter((c) => (c.priorita ?? "").toLowerCase() === filter);
  }, [withCoords, filter]);

  const optimized = useMemo(() => {
    if (!routeMode || !start) return [];
    return optimizeRoute(filtered, start[0], start[1]);
  }, [routeMode, start, filtered]);

  const routeLine: [number, number][] = useMemo(() => {
    if (!routeMode || !start || !optimized.length) return [];
    return [start, ...optimized.map((c) => [c.latitudine!, c.longitudine!] as [number, number])];
  }, [routeMode, start, optimized]);

  useEffect(() => {
    if (routeMode && !start && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setStart([p.coords.latitude, p.coords.longitude]),
        () => setStart([45.4642, 9.19]) // fallback Milano
      );
    }
  }, [routeMode, start]);

  const center: [number, number] = withCoords.length
    ? [withCoords[0].latitudine!, withCoords[0].longitudine!]
    : [41.9, 12.5];

  return (
    <MainLayout>
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <MapPin className="h-8 w-8 text-brand-blue" /> Mappa Clienti
            </h1>
            <p className="text-muted-foreground">{withCoords.length} clienti geolocalizzati · {missing} mancanti</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {missing > 0 && (
              <Button size="sm" variant="outline" onClick={() => geocode.mutate(clienti)} disabled={geocode.isPending}>
                {geocode.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Locate className="h-4 w-4 mr-1" />}
                Geocodifica {Math.min(20, missing)}
              </Button>
            )}
            <Button size="sm" variant={routeMode ? "default" : "outline"} onClick={() => setRouteMode(!routeMode)}>
              <RouteIcon className="h-4 w-4 mr-1" /> {routeMode ? "Ferma pianificazione" : "Pianifica giro"}
            </Button>
          </div>
        </header>

        <div className="flex gap-2 flex-wrap">
          {["all","risk","target","potential","routine"].map((p) => (
            <Badge key={p}
              className="cursor-pointer"
              variant={filter === p ? "default" : "outline"}
              onClick={() => setFilter(p)}
            >
              {p === "all" ? "Tutti" : p}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Card className="p-0 overflow-hidden surface-noir h-[70vh]">
            <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.map((c) => (
                <Marker
                  key={c.id}
                  position={[c.latitudine!, c.longitudine!]}
                  icon={coloredIcon(priorityColor[(c.priorita ?? "").toLowerCase()] ?? "#64748b")}
                >
                  <Popup>
                    <strong>{c.nome}</strong>
                    {c.citta && <div>{c.citta}</div>}
                    {c.zona && <div>Zona: {c.zona}</div>}
                    {c.priorita && <div>Priorità: {c.priorita}</div>}
                    {c.fatturato != null && <div>Fatturato: €{Number(c.fatturato).toFixed(0)}</div>}
                    <div><a href={`/clienti/${c.id}`}>Apri scheda</a></div>
                  </Popup>
                </Marker>
              ))}
              {routeLine.length > 1 && <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.7} />}
            </MapContainer>
          </Card>
        )}

        {routeMode && optimized.length > 0 && (
          <Card className="p-4 surface-noir">
            <h3 className="font-semibold mb-2">Giro ottimizzato ({optimized.length} tappe)</h3>
            <ol className="space-y-1 text-sm list-decimal list-inside">
              {optimized.map((c) => <li key={c.id}>{c.nome} <span className="text-muted-foreground">— {c.citta}</span></li>)}
            </ol>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
