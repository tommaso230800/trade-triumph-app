import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Mail, MessageSquare, Copy, ExternalLink } from "lucide-react";
import { TEMPLATES, renderTemplate, useLogComunicazione } from "@/hooks/useComunicazioni";
import { useClienti } from "@/hooks/useClienti";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function CentroComunicazioni() {
  const { data: clienti = [] } = useClienti();
  const log = useLogComunicazione();
  const [clienteId, setClienteId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id);
  const [canale, setCanale] = useState<string>("whatsapp");
  const [oggetto, setOggetto] = useState("");
  const [corpo, setCorpo] = useState("");

  const cliente = clienti.find((c: any) => c.id === clienteId);
  const template = TEMPLATES.find((t) => t.id === templateId)!;

  const applyTemplate = () => {
    const vars = { cliente: cliente?.nome ?? "", prodotto: "", fattura: "" };
    setOggetto(renderTemplate(template.oggetto, vars));
    setCorpo(renderTemplate(template.corpo, vars));
  };

  useMemo(() => { applyTemplate(); /* eslint-disable-next-line */ }, [templateId, clienteId]);

  const invia = () => {
    if (!cliente) return toast.error("Seleziona un cliente");
    const destinatario =
      canale === "whatsapp" ? (cliente.telefono || "") :
      canale === "email" ? (cliente.email || "") : "";
    log.mutate({
      cliente_id: cliente.id,
      canale,
      template: templateId,
      oggetto,
      contenuto: corpo,
      destinatario,
    } as any);
    if (canale === "whatsapp" && destinatario) {
      const phone = destinatario.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(corpo)}`, "_blank");
    } else if (canale === "email" && destinatario) {
      window.open(`mailto:${destinatario}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`);
    }
  };

  const copia = () => { navigator.clipboard.writeText(corpo); toast.success("Copiato"); };

  return (
    <MainLayout>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-brand-green" /> Centro Comunicazioni
          </h1>
          <p className="text-muted-foreground">Template precompilati per WhatsApp, Email, PDF. Ogni invio viene tracciato.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4 surface-noir space-y-3">
            <div>
              <label className="text-sm font-medium">Cliente</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Scegli cliente" /></SelectTrigger>
                <SelectContent className="max-h-72">{clienti.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Template</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Canale</label>
              <div className="flex gap-2 mt-1">
                {[
                  { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
                  { id: "email", icon: Mail, label: "Email" },
                  { id: "pdf", icon: Copy, label: "Copia/PDF" },
                ].map((c) => (
                  <Button key={c.id} size="sm" variant={canale === c.id ? "default" : "outline"} onClick={() => setCanale(c.id)}>
                    <c.icon className="h-4 w-4 mr-1" />{c.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4 surface-noir space-y-3">
            {canale === "email" && (
              <Input placeholder="Oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
            )}
            <Textarea rows={10} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={copia}><Copy className="h-4 w-4 mr-1" /> Copia</Button>
              <Button onClick={invia} className="flex-1">
                {canale === "pdf" ? <><Copy className="h-4 w-4 mr-1" />Registra invio</> : <><ExternalLink className="h-4 w-4 mr-1" />Apri {canale} e registra</>}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
