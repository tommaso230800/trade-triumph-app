import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { queryClient, persister } from "@/lib/queryClient";
import { OfflineBanner } from "@/components/OfflineBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Aziende from "./pages/Aziende";
import AziendaDettaglio from "./pages/AziendaDettaglio";
import Clienti from "./pages/Clienti";
import ClienteDettaglio from "./pages/ClienteDettaglio";
import ConsorzioDettaglio from "./pages/ConsorzioDettaglio";
import Ordini from "./pages/Ordini";
import KPI from "./pages/KPI";
import Provvigioni from "./pages/Provvigioni";
import Canvass from "./pages/Canvass";
import AssistenteAICommerciale from "./pages/AssistenteAICommerciale";
import RiordinoForecast from "./pages/RiordinoForecast";
import IntelligenzaCommerciale from "./pages/IntelligenzaCommerciale";
import Diagnostica from "./pages/Diagnostica";

import Impostazioni from "./pages/Impostazioni";
import PreparaVisita from "./pages/PreparaVisita";
import NotFound from "./pages/NotFound";

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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/aziende" element={<Aziende />} />
              <Route path="/aziende/:id" element={<AziendaDettaglio />} />
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/clienti/:id" element={<ClienteDettaglio />} />
              <Route path="/clienti/consorzio/:slug" element={<ConsorzioDettaglio />} />
              <Route path="/ordini" element={<Ordini />} />
              <Route path="/kpi" element={<KPI />} />
              <Route path="/provvigioni" element={<Provvigioni />} />
              <Route path="/canvass" element={<Canvass />} />
              <Route path="/assistente-ai" element={<AssistenteAI />} />
              <Route path="/ai-commerciale" element={<AssistenteAICommerciale />} />
              <Route path="/riordino" element={<RiordinoForecast />} />
              <Route path="/intelligenza-commerciale" element={<IntelligenzaCommerciale />} />
              <Route path="/impostazioni" element={<Impostazioni />} />
              <Route path="/diagnostica" element={<Diagnostica />} />
              <Route path="/prepara-visita" element={<PreparaVisita />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
