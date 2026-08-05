import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { queryClient, persister } from "@/lib/queryClient";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PageLoader } from "@/components/PageLoader";

// Index e Auth restano eager: sono le prime schermate viste dall'utente
// (evita uno "sfarfallio" di loader all'avvio dell'app).
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Tutte le altre pagine sono caricate on-demand (code splitting per rotta):
// riduce il bundle iniziale, soprattutto rilevante per l'avvio dell'app mobile.
const Aziende = lazy(() => import("./pages/Aziende"));
const AziendaDettaglio = lazy(() => import("./pages/AziendaDettaglio"));
const Clienti = lazy(() => import("./pages/Clienti"));
const ClienteDettaglio = lazy(() => import("./pages/ClienteDettaglio"));
const ConsorzioDettaglio = lazy(() => import("./pages/ConsorzioDettaglio"));
const Ordini = lazy(() => import("./pages/Ordini"));
const KPI = lazy(() => import("./pages/KPI"));
const Provvigioni = lazy(() => import("./pages/Provvigioni"));
const Canvass = lazy(() => import("./pages/Canvass"));
const AssistenteAICommerciale = lazy(() => import("./pages/AssistenteAICommerciale"));
const RiordinoForecast = lazy(() => import("./pages/RiordinoForecast"));
const IntelligenzaCommerciale = lazy(() => import("./pages/IntelligenzaCommerciale"));
const Diagnostica = lazy(() => import("./pages/Diagnostica"));
const Impostazioni = lazy(() => import("./pages/Impostazioni"));
const PreparaVisita = lazy(() => import("./pages/PreparaVisita"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: persister!,
      maxAge: 1000 * 60 * 60 * 24,
      buster: "v2",
    }}
  >
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineBanner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/aziende" element={<Aziende />} />
                <Route path="/aziende/:id" element={<AziendaDettaglio />} />
                <Route path="/clienti" element={<Clienti />} />
                <Route path="/clienti/:id" element={<ClienteDettaglio />} />
                <Route path="/clienti/consorzio/:slug" element={<ConsorzioDettaglio />} />
                <Route path="/ordini" element={<Ordini />} />
                <Route path="/email-ordini" element={<EmailOrdini />} />
               <Route path="/kpi" element={<KPI />} />
                <Route path="/provvigioni" element={<Provvigioni />} />
                <Route path="/canvass" element={<Canvass />} />
                <Route path="/ai-commerciale" element={<AssistenteAICommerciale />} />
                <Route path="/riordino" element={<RiordinoForecast />} />
                <Route path="/intelligenza-commerciale" element={<IntelligenzaCommerciale />} />
                <Route path="/impostazioni" element={<Impostazioni />} />
                <Route path="/diagnostica" element={<Diagnostica />} />
                <Route path="/prepara-visita" element={<PreparaVisita />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
