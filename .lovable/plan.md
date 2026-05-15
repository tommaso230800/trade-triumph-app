# Rifacimento contrasto + potenziamento app per agenti

## Problema
Le scritte risultano sbiadite, le card sembrano trasparenti, l'app non sfrutta tutto il potenziale per un agente di commercio sul campo.

## Obiettivo
1. Tema scuro **leggibile in qualsiasi condizione di luce** (anche su iPad in pieno sole).
2. Trasformare l'app in uno strumento operativo professionale per l'agente.

---

## Parte 1 — Leggibilità totale (priorità massima)

- **Sfondo più scuro e pieno**: nero-blu profondo opaco, niente trasparenze residue dietro le card.
- **Testi ad alto contrasto**:
  - `foreground` puro bianco caldo (≥ 96% luminosità)
  - `muted-foreground` portato a ≥ 88% (oggi 78%)
  - `card-foreground` solido, mai sotto 95%
- **Card opache**: rimuovo `surface-glass`/blur dalle card di contenuto principali; resta solo per overlay (modali, sheet).
- **Bordi visibili**: border al 30% (oggi 22%).
- **Aurora di sfondo molto attenuata**: opacity max 4–5%, dietro `z-0`, non più davanti al contenuto.
- **Input e tabelle**: sfondo solido `card`, testo bianco, placeholder al 70%.
- **Badge e link**: colore pieno (blu/verde/giallo/rosso) su sfondo opaco, niente più testo gradient sottile sui valori KPI.
- **KPI numerici**: bianco solido grande, l'accento colorato resta solo sull'icona o sul bordo sinistro.
- Audit rapido pagina per pagina (Dashboard, Clienti, Ordini, Aziende, KPI, Provvigioni, Visite, Trattative, Canvass) per sostituire ogni `text-muted-foreground/50`, `bg-*/10`, `text-gradient-*` su numeri.

## Parte 2 — Potenziamento per agenti di commercio

Aggiungo / rinforzo i moduli che un agente usa ogni giorno:

1. **Dashboard "Giornata dell'agente"**
   - Riordini in scadenza (già presente, evidenziato in alto)
   - Clienti prioritari della settimana
   - Trattative in chiusura (deal aperti con data prevista vicina)
   - Provvigioni maturate del mese in corso vs target
   - Ultime visite registrate

2. **Quick actions sempre raggiungibili** (FAB mobile + barra desktop)
   - Nuovo ordine
   - Registra visita
   - Nuova trattativa
   - Nuovo promemoria

3. **Scheda cliente potenziata**
   - Semaforo stato (verde/giallo/rosso) ben visibile
   - Storico ordini con grafico mensile
   - Promo attive sul cliente
   - Trattative collegate
   - Note rapide e ultime visite
   - Pulsante "Chiama / WhatsApp / Email" diretto

4. **Ordini più solidi**
   - Filtro rapido per mese/azienda/stato già presente, lo rendo più visibile
   - Riepilogo a colpo d'occhio (totale imponibile, n° cartoni, sconti applicati)
   - Bottone "Ricomponi ordine" (riordino) in evidenza

5. **KPI e provvigioni**
   - Confronto YoY 2025 vs anno corrente
   - Top crescita / top calo clienti
   - Provvigioni per trimestre con stato (maturata, fatturata, incassata)

6. **Promemoria e visite**
   - Timeline cronologica unica per cliente
   - Notifica visiva sui clienti senza visite da > X giorni

> Nessun calendario / giro visite / assistente pre-visita / clienti da visitare (vincoli del progetto).

---

## Dettagli tecnici

- File chiave da rivedere: `src/index.css` (token HSL, utilities), `tailwind.config.ts`, `src/components/layout/MainLayout.tsx`, tutte le pagine in `src/pages/`, primitive `ui/card.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ui/table.tsx`, `ui/input.tsx`.
- Refactor "search & replace" sistematico delle classi a basso contrasto:
  - `text-muted-foreground/50|60|70` → `text-muted-foreground`
  - `bg-card/50|60|70` su card principali → `bg-card`
  - `text-gradient-*` su numeri KPI → `text-foreground`
- Le animazioni (rise-in, blur-in, hover-glow) restano ma non riducono mai l'opacità finale sotto 1.
- Mantengo design tokens semantici (no colori hardcoded nei componenti).

## Cosa NON cambia

- Logica business (import PDF, calcolo cartoni, sconti a cascata, RLS, edge functions) resta identica.
- Niente reintroduzione di Diario Giornaliero, Giro Visita, Assistente Pre-Visita, Clienti da Visitare.
