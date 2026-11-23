import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  isNativeApp,
  type PermissionState,
} from "@/lib/pushNotifications";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, themeConfigs, ThemeStyle, designConfigs, DesignStyle } from "@/hooks/useTheme";
import { toast } from "sonner";
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Loader2,
  Save,
  Mail, 
  Phone,
  Building2,
  Check,
  BellRing,
  Send,
  AlertTriangle, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntegrityCheckPanel } from "@/components/metrics/IntegrityCheckPanel";
import { OneDrivePanel } from "@/components/impostazioni/OneDrivePanel";
import { AccountSecurityCard } from "@/components/impostazioni/AccountSecurityCard";

const Impostazioni = () => {
  const { user } = useAuth();
  const { theme, setTheme, design, setDesign } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    telefono: "",
    azienda: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    ordini: true,
    promemoria: true,
  });
  const [pushPermission, setPushPermission] = useState<PermissionState>("prompt");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    getNotificationPermission().then(setPushPermission);
  }, []);

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const p = await requestNotificationPermission();
      setPushPermission(p);
      if (p === "granted") toast.success("Notifiche attivate");
      else if (p === "denied") toast.error("Permesso negato. Abilitalo dalle impostazioni di sistema.");
      else toast.message("Notifiche non supportate su questo dispositivo");
    } catch (e: any) {
      toast.error(e?.message ?? "Errore attivazione notifiche");
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendTest = async () => {
    setPushBusy(true);
    try {
      await sendTestNotification();
      toast.success("Notifica di test inviata");
    } catch (e: any) {
      toast.error(e?.message ?? "Impossibile inviare la notifica");
    } finally {
      setPushBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profilo aggiornato con successo!");
    } catch (err) {
      console.error(err);
      toast.error("Errore nell'aggiornamento del profilo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: ThemeStyle) => {
    setTheme(newTheme);
    toast.success(`Tema "${themeConfigs[newTheme].name}" applicato!`);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("notifications-settings", JSON.stringify(notifications));
    toast.success("Preferenze notifiche salvate!");
  };

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-6 max-w-4xl animate-fade-in px-2 sm:px-0">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="page-title">Impostazioni</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci il tuo profilo e le preferenze dell'applicazione
          </p>
        </div>

        {/* Design: cambia l'intera interfaccia (layout, sidebar, superfici, colori) */}
        <Card className="shadow-card">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <LayoutTemplate className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Design</CardTitle>
                <CardDescription>Cambia l'aspetto completo dell'app su questo dispositivo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {(Object.entries(designConfigs) as [DesignStyle, typeof designConfigs[DesignStyle]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={design === key}
                  onClick={() => {
                    setDesign(key);
                    toast.success(`Design "${config.name}" applicato`);
                  }}
                  className={cn(
                    "relative rounded-xl border p-4 text-left transition-colors duration-200 touch-target sm:p-6",
                    design === key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  {/* Anteprima schematica: sidebar + due card */}
                  {(() => {
                    const pv = {
                      classico: { box: "rounded-md border bg-[#f2f5fa]", side: "bg-[#e2e8f0]", card: "rounded-sm border bg-white", dot: "rounded-full bg-[#2563eb]" },
                      pannelli: { box: "rounded-xl bg-[#121419]", side: "rounded-lg bg-[#1a1d23]", card: "rounded-lg bg-[#1a1d23]", dot: "rounded-full bg-[#3b82f6]" },
                      unslop: { box: "rounded-sm border border-[#ddd9d1] bg-[#f8f7f4]", side: "border-r border-[#ddd9d1] bg-[#f1efe9]", card: "rounded-[3px] border border-[#ddd9d1] bg-white", dot: "rounded-none bg-[#23408f]" },
                    }[key];
                    return (
                      <div aria-hidden className={cn("mb-3 flex h-16 gap-1 overflow-hidden p-1", pv.box)}>
                        <div className={cn("w-1/4", pv.side)} />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className={cn("flex-1", pv.card)} />
                          <div className={cn("flex-1", pv.card)}>
                            <div className={cn("m-1 h-1 w-1/3", pv.dot)} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <h3 className="text-base font-semibold">{config.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{config.description}</p>
                  {design === key && (
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card className="shadow-card transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <Palette className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle >Tema Interfaccia</CardTitle>
                <CardDescription>
                  {design !== "classico"
                    ? `Il design ${designConfigs[design].name} usa una palette propria: il tema si applica con il design Classico.`
                    : "Scegli i colori che preferisci"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4", design !== "classico" && "opacity-60")}>
              {(Object.entries(themeConfigs) as [ThemeStyle, typeof themeConfigs[ThemeStyle]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={cn(
                    "relative rounded-xl border p-4 text-left transition-colors duration-200 touch-target sm:p-6",
                    theme === key
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  {/* Theme Preview */}
                  <div className="flex gap-2 mb-3">
                    <div 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg shadow-sm"
                      style={{ backgroundColor: `hsl(${config.colors["--primary"]})` }}
                    />
                    <div 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg shadow-sm"
                      style={{ backgroundColor: `hsl(${config.colors["--accent"]})` }}
                    />
                    <div 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg shadow-sm border"
                      style={{ backgroundColor: `hsl(${config.colors["--background"]})` }}
                    />
                  </div>
                  
                  <h3 className="font-semibold text-base sm:text-base">{config.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{config.description}</p>
                  
                  {theme === key && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile Section */}
        <Card className="shadow-card transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle >Profilo</CardTitle>
                <CardDescription>Informazioni personali e account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold tracking-tight tabular-nums text-primary-foreground flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user?.email}</p>
                <Badge variant="secondary" className="mt-1">Account Attivo</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nome Completo
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-11 sm:h-12 bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telefono
                </Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+39 333 123 4567"
                  className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Azienda
                </Label>
                <Input
                  value={formData.azienda}
                  onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                  placeholder="Nome Azienda"
                  className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={isLoading} className="gap-2 h-11 sm:h-12 w-full sm:w-auto">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva Profilo
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="shadow-card transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle >Notifiche</CardTitle>
                <CardDescription>Gestisci le tue preferenze di notifica</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
            <p className="text-sm text-muted-foreground">Avvisi su nuovi ordini, ordini inviati e riordini in ritardo, con attivazione dei dispositivi e notifica di prova.</p>
            <Button asChild className="h-11 w-full gap-2 sm:w-auto">
              <Link to="/notifiche"><BellRing className="h-4 w-4" />Apri Centro notifiche</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Account, password e utenti dell’agenzia */}
        <AccountSecurityCard />

        {/* Problematiche: esiti del controllo dati con stato di lavorazione */}
        <Card className="shadow-card transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle >Problematiche</CardTitle>
                <CardDescription>Incongruenze rilevate dal controllo dati, con stato di lavorazione</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Button asChild variant="outline" className="w-full justify-start gap-2 h-11 sm:h-12">
              <Link to="/impostazioni/problematiche">
                Apri la pagina Problematiche
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Integrazione Microsoft OneDrive — centro di controllo sincronizzazione */}
        <OneDrivePanel />

        {/* Integrity Check — Fase 1.5 */}
        <IntegrityCheckPanel />
      </div>
    </MainLayout>
  );
};

export default Impostazioni;
