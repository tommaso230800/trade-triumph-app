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
  Moon,
  Sun
} from "lucide-react";

const Impostazioni = () => {
  const { user } = useAuth();
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
  const [darkMode, setDarkMode] = useState(false);

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

  return (
    <MainLayout>
      <div className="space-y-8 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="page-title">Impostazioni</h1>
          <p className="text-body-md text-muted-foreground">
            Gestisci il tuo profilo e le preferenze dell'applicazione
          </p>
        </div>

        {/* Profile Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Profilo</CardTitle>
                <CardDescription>Informazioni personali e account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-1">Account Attivo</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nome Completo
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telefono
                </Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+39 333 123 4567"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Azienda
                </Label>
                <Input
                  value={formData.azienda}
                  onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                  placeholder="Nome Azienda"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva Profilo
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Notifiche</CardTitle>
                <CardDescription>Gestisci le tue preferenze di notifica</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">Notifiche Email</p>
                <p className="text-sm text-muted-foreground">Ricevi aggiornamenti via email</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">Notifiche Push</p>
                <p className="text-sm text-muted-foreground">Ricevi notifiche sul dispositivo</p>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">Nuovi Ordini</p>
                <p className="text-sm text-muted-foreground">Avvisi per nuovi ordini ricevuti</p>
              </div>
              <Switch
                checked={notifications.ordini}
                onCheckedChange={(checked) => setNotifications({ ...notifications, ordini: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">Promemoria</p>
                <p className="text-sm text-muted-foreground">Ricorda scadenze e appuntamenti</p>
              </div>
              <Switch
                checked={notifications.promemoria}
                onCheckedChange={(checked) => setNotifications({ ...notifications, promemoria: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Aspetto</CardTitle>
                <CardDescription>Personalizza l'aspetto dell'applicazione</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-warning" />}
                <div>
                  <p className="font-medium">Tema Scuro</p>
                  <p className="text-sm text-muted-foreground">Attiva la modalità scura</p>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="shadow-card hover-lift transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-heading-sm">Sicurezza</CardTitle>
                <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              Cambia Password
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
              Elimina Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Impostazioni;
