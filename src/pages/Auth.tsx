import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Users,
  Building2,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import agencyLogo from "@/assets/agency-logo.jpg";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().email("Email non valida");
const passwordSchema = z.string().min(6, "La password deve avere almeno 6 caratteri");

const FEATURES = [
  { icon: Users, title: "Clienti", text: "Schede complete, contatti a un tocco e storico ordini" },
  { icon: Building2, title: "Aziende", text: "Listini, marchi e condizioni sempre aggiornati" },
  { icon: ShoppingCart, title: "Ordini", text: "Creazione guidata, proforma e stati di lavorazione" },
  { icon: BarChart3, title: "Analisi vendite", text: "Fatturato, confronti annuali e classifiche in tempo reale" },
];

export default function Auth() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) {
      setErrorMsg(emailCheck.error.errors[0].message);
      return;
    }
    const passCheck = passwordSchema.safeParse(password);
    if (!passCheck.success) {
      setErrorMsg(passCheck.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Credenziali non valide. Controlla email e password.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrorMsg("Email non confermata. Controlla la tua casella di posta.");
      } else {
        setErrorMsg("Accesso non riuscito. Riprova tra poco.");
      }
      return;
    }

    toast.success("Benvenuto!");
    navigate("/");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) {
      setErrorMsg(emailCheck.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);

    if (error) {
      setErrorMsg("Invio non riuscito. Controlla l'indirizzo e riprova.");
      return;
    }
    setResetSent(true);
  };

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-2">
      {/* Sezione identità del portale (solo desktop) */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Sfondo: sfumature e forme discrete legate al tema */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-card shadow-lg">
            <img src={agencyLogo} alt="Logo AMG" className="h-full w-full object-contain p-1.5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-foreground">AMG HO.RE.CA</p>
            <p className="text-sm text-muted-foreground">Business &amp; Strategy</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Il tuo lavoro sul campo,
              <br />
              in un unico portale.
            </h2>
            <p className="max-w-md text-base text-muted-foreground">
              Clienti, aziende, ordini e analisi delle vendite: tutto quello che serve
              a un agente di commercio, sempre con te.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
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

        <p className="relative text-xs text-muted-foreground">
          Accesso riservato agli agenti autorizzati.
        </p>
      </div>

      {/* Sezione modulo di accesso */}
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-in-up animate-fill-both">
          {/* Intestazione compatta (sempre visibile; su mobile sostituisce la sezione identità) */}
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-lg lg:hidden">
              <img src={agencyLogo} alt="Logo AMG" className="h-full w-full object-contain p-1.5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Accedi al tuo portale" : "Recupera password"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "login"
                ? "Bentornato: inserisci le tue credenziali per continuare."
                : "Inserisci la tua email: ti invieremo un link per impostare una nuova password."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            {mode === "reset" && resetSent ? (
              <div className="space-y-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">Email inviata</p>
                  <p className="text-sm text-muted-foreground">
                    Se l'indirizzo è registrato, riceverai a breve il link per reimpostare la password.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-lg"
                  onClick={() => {
                    setMode("login");
                    setResetSent(false);
                    setErrorMsg(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Torna all'accesso
                </Button>
              </div>
            ) : (
              <form onSubmit={mode === "login" ? handleLogin : handleReset} className="space-y-5" noValidate>
                {errorMsg && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="group relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@esempio.it"
                      disabled={loading}
                      className="h-12 rounded-lg pl-10 transition-all duration-200 focus-visible:ring-2"
                      autoComplete="email"
                      inputMode="email"
                      autoFocus
                    />
                  </div>
                </div>

                {mode === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("reset");
                          setErrorMsg(null);
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Password dimenticata?
                      </button>
                    </div>
                    <div className="group relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        className="h-12 rounded-lg pl-10 pr-12 transition-all duration-200 focus-visible:ring-2"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg text-base font-semibold transition-all duration-200"
                  disabled={loading || !email || (mode === "login" && !password)}
                >
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading
                    ? mode === "login"
                      ? "Accesso in corso…"
                      : "Invio in corso…"
                    : mode === "login"
                      ? "Accedi"
                      : "Invia link di recupero"}
                </Button>

                {mode === "reset" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 w-full rounded-lg"
                    onClick={() => {
                      setMode("login");
                      setErrorMsg(null);
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Torna all'accesso
                  </Button>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            AMG HO.RE.CA · Business &amp; Strategy
          </p>
        </div>
      </div>
    </div>
  );
}
