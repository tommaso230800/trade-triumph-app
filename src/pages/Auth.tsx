import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Users, Building2, ShoppingCart, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestPasswordRecovery, signInWithUsername } from "@/lib/agencyAuth";
import agencyLogo from "@/assets/agency-logo.jpg";

const FEATURES = [
  { icon: Users, title: "Clienti", text: "Schede complete, contatti a un tocco e storico ordini" },
  { icon: Building2, title: "Aziende", text: "Listini, marchi e condizioni sempre aggiornati" },
  { icon: ShoppingCart, title: "Ordini", text: "Creazione guidata, proforma e invio al fornitore" },
  { icon: BarChart3, title: "Analisi vendite", text: "Fatturato, confronti annuali e statistiche prodotto" },
];

export default function Auth() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim()) return setErrorMsg("Inserisci lo username.");
    if (!password) return setErrorMsg("Inserisci la password.");
    setLoading(true);
    const { error } = await signInWithUsername(username, password);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    toast.success("Bentornato!");
    navigate("/");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim()) return setErrorMsg("Inserisci lo username.");
    setLoading(true);
    const { message, error } = await requestPasswordRecovery(username);
    setLoading(false);
    if (error) return setErrorMsg(error);
    setResetMessage(message);
  };

  const backToLogin = () => {
    setMode("login");
    setResetMessage(null);
    setErrorMsg(null);
  };

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-2">
      {/* Identità del portale (solo desktop) */}
      <div className="hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-xl border border-border bg-background">
            <img src={agencyLogo} alt="Logo AMG" className="h-full w-full object-contain p-1.5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-foreground">AMG HO.RE.CA</p>
            <p className="text-sm text-muted-foreground">Mazzi Group · Business &amp; Strategy</p>
          </div>
        </div>
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Il lavoro dell’agenzia,
              <br />
              in un unico portale.
            </h2>
            <p className="max-w-md text-base text-muted-foreground">
              Clienti, aziende, ordini e statistiche condivisi tra tutto il team, sempre aggiornati.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Accesso riservato al team dell’agenzia.</p>
      </div>

      {/* Modulo di accesso */}
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-card lg:hidden">
              <img src={agencyLogo} alt="Logo AMG" className="h-full w-full object-contain p-1.5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Accedi al portale" : "Recupera password"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "login"
                ? "Inserisci username e password."
                : "Inserisci il tuo username: ti indicheremo come reimpostare la password."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            {mode === "reset" && resetMessage ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                <p className="text-sm text-foreground">{resetMessage}</p>
                <Button type="button" variant="outline" className="h-12 w-full rounded-lg" onClick={backToLogin}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Torna all’accesso
                </Button>
              </div>
            ) : (
              <form onSubmit={mode === "login" ? handleLogin : handleReset} className="space-y-4" noValidate method="post" action="#">
                {errorMsg && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-sm font-medium">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Es. Gabriele"
                      disabled={loading}
                      className="h-12 rounded-lg pl-10 text-base"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                    />
                  </div>
                </div>

                {mode === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setMode("reset"); setErrorMsg(null); }}
                        className="min-h-[44px] px-1 text-sm font-medium text-primary hover:underline"
                      >
                        Password dimenticata?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        className="h-12 rounded-lg pl-10 pr-12 text-base"
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">La password distingue maiuscole e minuscole.</p>
                  </div>
                )}

                <Button type="submit" className="h-12 w-full rounded-lg text-base font-semibold" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading ? (mode === "login" ? "Accesso in corso…" : "Invio in corso…") : mode === "login" ? "Accedi" : "Continua"}
                </Button>

                {mode === "reset" && (
                  <Button type="button" variant="ghost" className="h-12 w-full rounded-lg" onClick={backToLogin}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Torna all’accesso
                  </Button>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">AMG HO.RE.CA · Mazzi Group</p>
        </div>
      </div>
    </div>
  );
}
