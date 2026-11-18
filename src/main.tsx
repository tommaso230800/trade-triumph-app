import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logClientError } from "@/hooks/useDiagnostica";

// Errori non gestiti (fuori dal rendering): registrati in Diagnostica, senza bloccare l'app.
// Limite: ogni messaggio una sola volta e al massimo 20 per sessione (es. rete assente).
const giaRegistrati = new Set<string>();
const registra = (fonte: string, messaggio: string, dettagli: unknown) => {
  const k = `${fonte}:${messaggio}`;
  if (giaRegistrati.has(k) || giaRegistrati.size >= 20) return;
  giaRegistrati.add(k);
  void logClientError(fonte, messaggio, dettagli);
};
window.addEventListener("error", (e) => {
  registra("errore_js", e.message || "Errore sconosciuto", { file: e.filename, riga: e.lineno });
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason as { message?: string } | undefined;
  registra("promise", r?.message ?? String(e.reason), null);
});

// App entry point. La protezione esterna copre anche ciò che sta fuori dalle pagine
// (notifiche a comparsa, banner offline): mai uno schermo completamente vuoto.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
