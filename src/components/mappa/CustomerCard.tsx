import { Link } from "react-router-dom";
import {
  Phone,
  Navigation,
  X,
  Plus,
  ClipboardPen,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATO_COLORI } from "@/lib/googleMaps";
import type { ClienteMappa } from "@/hooks/useMappaClienti";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dataIt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "N/D";

type Props = {
  cliente: ClienteMappa;
  inGiro: boolean;
  onChiudi: () => void;
  onAggiungiGiro: () => void;
  onRegistraVisita: () => void;
};

export function CustomerCard({ cliente, inGiro, onChiudi, onAggiungiGiro, onRegistraVisita }: Props) {
  const colore = STATO_COLORI[cliente.stato];
  const dest = `${cliente.lat},${cliente.lng}`;

  return (
    <div className="rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-md">
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: colore.fill }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight">{cliente.nome}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {[cliente.citta, cliente.provincia].filter(Boolean).join(" · ") || "Località N/D"}
            </span>
          </p>
        </div>
        <button
          onClick={onChiudi}
          aria-label="Chiudi scheda cliente"
          className="touch-target -mr-1 -mt-1 rounded-lg p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border px-4 py-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fatturato</p>
          <p className="text-right font-semibold tabular-nums sm:text-left">{euro.format(cliente.fatturato)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ordini</p>
          <p className="text-right font-semibold tabular-nums sm:text-left">{cliente.ordiniCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ultimo ordine</p>
          <p className="font-medium">
            {dataIt(cliente.ultimoOrdine)}
            {cliente.giorniUltimoOrdine !== null && (
              <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                ({cliente.giorniUltimoOrdine} gg)
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ultima visita</p>
          <p className="font-medium">{dataIt(cliente.ultimaVisita)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Aziende acquistate</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {cliente.aziende.length ? (
              cliente.aziende.map((a) => (
                <Badge key={a} variant="secondary" className="text-[11px]">
                  {a}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">N/D</span>
            )}
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Badge
            variant="outline"
            style={{ borderColor: colore.fill, color: colore.fill }}
            className="text-[11px]"
          >
            {colore.label}
          </Badge>
          {cliente.insoluto > 0 && (
            <Badge variant="destructive" className="text-[11px]">
              Insoluto {euro.format(cliente.insoluto)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-5">
        <Button asChild size="sm" variant="default" className="col-span-2 sm:col-span-1">
          <Link to={`/clienti/${cliente.id}`}>
            Apri <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          asChild={!!cliente.telefono}
          size="sm"
          variant="outline"
          disabled={!cliente.telefono}
        >
          {cliente.telefono ? (
            <a href={`tel:${cliente.telefono}`}>
              <Phone className="mr-1 h-3.5 w-3.5" /> Chiama
            </a>
          ) : (
            <span>
              <Phone className="mr-1 h-3.5 w-3.5" /> Chiama
            </span>
          )}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation className="mr-1 h-3.5 w-3.5" /> Naviga
          </a>
        </Button>
        <Button size="sm" variant={inGiro ? "secondary" : "outline"} onClick={onAggiungiGiro}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {inGiro ? "Nel giro" : "Al giro"}
        </Button>
        <Button size="sm" variant="outline" onClick={onRegistraVisita}>
          <ClipboardPen className="mr-1 h-3.5 w-3.5" /> Visita
        </Button>
      </div>
    </div>
  );
}
