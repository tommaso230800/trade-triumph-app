import { Link } from "react-router-dom";
import { BellPlus, Mail, MessageCircle, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { mapsHref, telHref, whatsappHref } from "@/lib/contactLinks";

type ClienteContatti = {
  id: string;
  nome: string;
  telefono?: string | null;
  email?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
};

/**
 * Barra azioni a un tocco sulla scheda cliente: chiama, WhatsApp, email,
 * navigatore, promemoria. Le azioni senza dato restano visibili ma disattivate,
 * così la posizione dei pulsanti non cambia da un cliente all'altro.
 */
export function ClienteQuickActions({ cliente }: { cliente: ClienteContatti }) {
  const actions = [
    { label: "Chiama", icon: Phone, href: telHref(cliente.telefono) },
    { label: "WhatsApp", icon: MessageCircle, href: whatsappHref(cliente.telefono), external: true },
    { label: "Email", icon: Mail, href: cliente.email ? `mailto:${cliente.email}` : null },
    { label: "Naviga", icon: Navigation, href: mapsHref([cliente.indirizzo, cliente.cap, cliente.citta, cliente.provincia]), external: true },
  ];

  const base = "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium";

  return (
    <nav aria-label={`Contatta ${cliente.nome}`} className="grid grid-cols-5 gap-1 rounded-xl border bg-card p-1 shadow-card">
      {actions.map(({ label, icon: Icon, href, external }) =>
        href ? (
          <a
            key={label}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(base, "text-foreground hover:bg-secondary")}
          >
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </a>
        ) : (
          <span key={label} className={cn(base, "text-muted-foreground opacity-50")} aria-disabled="true" title={`${label}: dato mancante`}>
            <Icon className="h-5 w-5" />
            {label}
          </span>
        ),
      )}
      <Link to={`/promemoria?nuovo=1&cliente=${cliente.id}`} className={cn(base, "text-foreground hover:bg-secondary")}>
        <BellPlus className="h-5 w-5 text-primary" />
        Promemoria
      </Link>
    </nav>
  );
}
