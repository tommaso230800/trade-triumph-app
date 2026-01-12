import { useState } from "react";
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
import { useTheme, themeConfigs, ThemeStyle } from "@/hooks/useTheme";
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
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const Impostazioni = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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
      <div className="space-y-6 sm:space-y-8 max-w-4xl animate-fade-in px-2 sm:px-0">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="page-title">Impostazioni</h1>
          <p className="text-body-md text-muted-foreground">
            Gestisci il tuo profilo e le preferenze dell'applicazione
          </p>
        </div>

        {/* Theme Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <Palette className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Tema Interfaccia</CardTitle>
                <CardDescription>Scegli l'aspetto che preferisci</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {(Object.entries(themeConfigs) as [ThemeStyle, typeof themeConfigs[ThemeStyle]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={cn(
                    "relative p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 text-left group touch-target",
                    theme === key
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted/30 active:scale-[0.98]"
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
                  
                  <h3 className="font-semibold text-base sm:text-lg">{config.name}</h3>
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
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Profilo</CardTitle>
                <CardDescription>Informazioni personali e account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xl sm:text-2xl font-bold text-primary-foreground flex-shrink-0">
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
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Notifiche</CardTitle>
                <CardDescription>Gestisci le tue preferenze di notifica</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors touch-target">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Notifiche Email</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Ricevi aggiornamenti via email</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors touch-target">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Notifiche Push</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Ricevi notifiche sul dispositivo</p>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors touch-target">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Nuovi Ordini</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avvisi per nuovi ordini ricevuti</p>
              </div>
              <Switch
                checked={notifications.ordini}
                onCheckedChange={(checked) => setNotifications({ ...notifications, ordini: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors touch-target">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Promemoria</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Ricorda scadenze e appuntamenti</p>
              </div>
              <Switch
                checked={notifications.promemoria}
                onCheckedChange={(checked) => setNotifications({ ...notifications, promemoria: checked })}
              />
            </div>
            <Button onClick={handleSaveNotifications} variant="outline" className="gap-2 h-11 sm:h-12 w-full sm:w-auto mt-2">
              <Save className="h-4 w-4" />
              Salva Preferenze
            </Button>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Sicurezza</CardTitle>
                <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
            <Button variant="outline" className="w-full justify-start gap-2 h-11 sm:h-12">
              Cambia Password
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-11 sm:h-12 text-destructive hover:text-destructive hover:bg-destructive/10">
              Elimina Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Impostazioni;
