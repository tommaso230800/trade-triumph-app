import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
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
import AssistenteTrattativa from "./pages/AssistenteTrattativa";

import AssistenteAICommerciale from "./pages/AssistenteAICommerciale";
import Trattative from "./pages/Trattative";
import TrattativaDettaglio from "./pages/TrattativaDettaglio";
import Impostazioni from "./pages/Impostazioni";
import NotePage from "./pages/Note";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
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
              <Route path="/assistente-trattativa" element={<AssistenteTrattativa />} />
              
              <Route path="/ai-commerciale" element={<AssistenteAICommerciale />} />
              <Route path="/trattative" element={<Trattative />} />
              <Route path="/trattative/:id" element={<TrattativaDettaglio />} />
              <Route path="/impostazioni" element={<Impostazioni />} />
              <Route path="/note" element={<NotePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
