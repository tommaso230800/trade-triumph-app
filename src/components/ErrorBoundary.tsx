import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Rete di sicurezza: se una pagina va in errore, al posto dello schermo bianco
 * compare un messaggio chiaro con "Riprova". Si azzera cambiando pagina.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-warning" />
        <p className="text-base font-semibold">Questa schermata non si è caricata correttamente</p>
        <p className="text-sm text-muted-foreground">
          I tuoi dati non sono stati toccati. Riprova; se succede di nuovo, torna alla Home e riapri la pagina.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => this.setState({ error: null })}>
            <RotateCcw className="h-4 w-4" />
            Riprova
          </Button>
          <Button variant="outline" onClick={() => { window.location.href = "/"; }}>
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }
}
