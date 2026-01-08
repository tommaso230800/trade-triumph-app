import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Aziende from "./pages/Aziende";
import Clienti from "./pages/Clienti";
import Ordini from "./pages/Ordini";
import Agenda from "./pages/Agenda";
import Promemoria from "./pages/Promemoria";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/aziende" element={<Aziende />} />
          <Route path="/clienti" element={<Clienti />} />
          <Route path="/ordini" element={<Ordini />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/promemoria" element={<Promemoria />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
