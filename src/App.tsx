import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Aziende from "./pages/Aziende";
import AziendaDettaglio from "./pages/AziendaDettaglio";
import Clienti from "./pages/Clienti";
import ClienteDettaglio from "./pages/ClienteDettaglio";
import Ordini from "./pages/Ordini";
import Agenda from "./pages/Agenda";
import Promemoria from "./pages/Promemoria";
import KPI from "./pages/KPI";
import Provvigioni from "./pages/Provvigioni";
import Canvass from "./pages/Canvass";
import GiroVisita from "./pages/GiroVisita";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="/ordini" element={<Ordini />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/promemoria" element={<Promemoria />} />
            <Route path="/kpi" element={<KPI />} />
            <Route path="/provvigioni" element={<Provvigioni />} />
            <Route path="/canvass" element={<Canvass />} />
            <Route path="/giro-visita" element={<GiroVisita />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
