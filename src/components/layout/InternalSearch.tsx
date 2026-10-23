import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Users, ShoppingCart, Package, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

const pages = [
  ["Dashboard", "/"], ["Ordini", "/ordini"], ["Analytics", "/analytics"], ["Pannello dati", "/pannello-dati"],
  ["Provvigioni", "/provvigioni"], ["Clienti", "/clienti"], ["Aziende", "/aziende"], ["Canvass/PFA", "/canvass"],
  ["Riordino", "/riordino"], ["Intelligenza", "/intelligenza-commerciale"], ["Prepara Visita", "/prepara-visita"],
  ["AI Commerciale", "/ai-commerciale"], ["Impostazioni", "/impostazioni"], ["Problematiche", "/impostazioni/problematiche"], ["Diagnostica", "/diagnostica"],
];
export function InternalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  useEffect(() => { const timer = setTimeout(() => setDebounced(term.trim()), 250); return () => clearTimeout(timer); }, [term]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(v => !v); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const results = useQuery({
    queryKey: ["internal_search", debounced], enabled: open && debounced.length >= 2,
    queryFn: async () => {
      const like = `%${debounced.replace(/[%_\\]/g, "\\$&").slice(0, 80)}%`;
      const responses = await Promise.all([
        supabase.from("clienti").select("id,nome").ilike("nome", like).limit(15),
        supabase.from("aziende").select("id,nome").ilike("nome", like).limit(15),
        supabase.from("ordini").select("id,codice,clienti(nome)").ilike("codice", like).limit(15),
        supabase.from("prodotti").select("id,nome,azienda_id").ilike("nome", like).limit(15),
      ]);
      for (const r of responses) if (r.error) throw r.error;
      return { clienti: responses[0].data ?? [], aziende: responses[1].data ?? [], ordini: responses[2].data ?? [], prodotti: responses[3].data ?? [] };
    },
  });
  const go = (path: string) => { setOpen(false); setTerm(""); navigate(path); };
  const matchedPages = pages.filter(([name]) => name.toLocaleLowerCase("it").includes(term.toLocaleLowerCase("it")));
  const total = Object.values(results.data ?? {}).reduce((n, list) => n + list.length, 0);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)} className="mb-6 h-11 w-full justify-start gap-2 text-muted-foreground lg:w-80" aria-label="Ricerca interna">
      <Search className="h-4 w-4 shrink-0" /> Cerca nel CRM
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Ricerca interna</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput value={term} onValueChange={setTerm} placeholder="Clienti, aziende, prodotti, codice ordine…" aria-label="Cerca nel CRM" className="pr-10" />
          <CommandList className="max-h-[65dvh]">
            {matchedPages.length > 0 && <CommandGroup heading="Pagine">{matchedPages.map(([name, path]) => <CommandItem key={path} onSelect={() => go(path)} className="min-h-11 gap-2"><ArrowUpRight className="h-4 w-4 shrink-0" />{name}</CommandItem>)}</CommandGroup>}
            {results.isFetching && <p className="p-4 text-sm text-muted-foreground">Ricerca in corso…</p>}
            {results.isError && <div className="p-4 text-sm">Ricerca non disponibile. <Button variant="outline" onClick={() => results.refetch()}>Riprova</Button></div>}
            {debounced.length >= 2 && !results.isFetching && !results.isError && total === 0 && <p className="p-4 text-sm text-muted-foreground">Nessun dato trovato</p>}
            {results.data?.clienti.length ? <CommandGroup heading="Clienti">{results.data.clienti.map(c => <CommandItem key={c.id} onSelect={() => go(`/clienti/${c.id}`)} className="min-h-11 gap-2"><Users className="h-4 w-4 shrink-0" /><span className="break-words">{c.nome}</span></CommandItem>)}</CommandGroup> : null}
            {results.data?.aziende.length ? <CommandGroup heading="Aziende">{results.data.aziende.map(c => <CommandItem key={c.id} onSelect={() => go(`/aziende/${c.id}`)} className="min-h-11 gap-2"><Building2 className="h-4 w-4 shrink-0" /><span className="break-words">{c.nome}</span></CommandItem>)}</CommandGroup> : null}
            {results.data?.ordini.length ? <CommandGroup heading="Ordini">{results.data.ordini.map(c => <CommandItem key={c.id} onSelect={() => go(`/ordini?ricerca=${encodeURIComponent(c.codice ?? "")}`)} className="min-h-11 gap-2"><ShoppingCart className="h-4 w-4 shrink-0" /><span className="break-words">{c.codice} · {c.clienti?.nome ?? "N/D"}</span></CommandItem>)}</CommandGroup> : null}
            {results.data?.prodotti.length ? <CommandGroup heading="Prodotti">{results.data.prodotti.map(c => <CommandItem key={c.id} onSelect={() => go(c.azienda_id ? `/aziende/${c.azienda_id}?prodotto=${c.id}` : "/aziende")} className="min-h-11 gap-2"><Package className="h-4 w-4 shrink-0" /><span className="break-words">{c.nome}</span></CommandItem>)}</CommandGroup> : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  </>;
}