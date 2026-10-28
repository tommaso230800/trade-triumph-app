# Roadmap

## Locandine, proposte e archivio collegati
- [x] Proposte salvate/versionate, editor, prodotti, promozioni/PFA e PDF A4
- [x] Accettazione atomica con opzioni indipendenti, storico listino e condizioni condivise implementata; PDF accettati protetti
- [x] Archivio file centrale e collegamenti azienda/cliente/editor; PDF Polara originale caricato e riletto nella scheda azienda
- [x] Riordino: dati aggiornati, aggiorna/riprova e ultimo aggiornamento; 127 prodotti urgenti letti, nessun overflow 320/375/430
- [x] 16 test regole; salvataggio/riapertura/PDF locandina verificati; righe PDF spezzate corrette e pagine ispezionate
- [ ] Verifica applicazione reale e ripetizione accettazione: serve una proposta effettivamente accettata e autorizzata; nessuna accettazione creata per prova
- [ ] Caso Polara/Elba completo salvato: Elba Bevande non presente fra i clienti; unità prezzo e trattamento IVA nel PDF non dichiarati, da confermare

## Correzione invio email interrotto
- [x] Eliminare le allocazioni per-byte nella preparazione MIME/PDF
- [x] Verificare allegati grandi e distribuire la correzione (16 test e allegato 12 MB con heap 128 MB)
- [x] Verificare l’esito del tentativo interrotto senza reinviarlo: Gmail non trova messaggi inviati con il Message-ID del tentativo

## Invio proforma via email
- [x] Gmail agenzia collegato e credenziali applicazione verificate
- [x] Impostazioni di invio separate per azienda
- [x] Composizione con saluti/data Europe/Rome e proforma aggiornato
- [x] Invio esplicito, protezione doppi tocchi, storico e reinvio implementati
- [x] Test fasce orarie e verifica composizione/PDF/errori su iPhone e computer
- [ ] Invio reale e lettura dello storico: serve un ordine e destinatario approvati per la prova; nessuna email inviata durante le verifiche

## Revisione iPhone e dati
- [x] Logo agenzia nelle icone installabili
- [x] Audit pagine iPhone e correzioni condivise
- [x] Ricerca interna
- [x] Audit dati nella pagina Ordini
- [x] Pannello dati con periodo e confronto PDF (valori dichiarati inseriti dall'utente)
- [x] Verifiche con dati reali e test

## Completati in precedenza
- [x] Analytics: filtri coerenti, YoY filtrato, Senza marchio, tooltip, iPhone
- [x] Pagamento "Come precedente ordine"
- [x] Riordino -> Ordina
- [x] Menu laterale senza "Mappa Clienti"
- [x] Importazione prodotti PDF in Aziende
- [x] Filtri Cliente/Azienda in Ordini + fix paginazione ordini

## Doc "Aggiorna le pagine Ordini, Analytics"
- [x] 1-2. Selettore Periodo unico (anno/mese, auto-generato, default anno corrente, persistenza) su Ordini e Analytics
- [x] 3. Coerenza filtri su tutti gli elementi + contesto attivo in alto
- [x] 4. Audit coerenza dati + fix formato valuta (1 € perso per arrotondamento)
- [x] 5. Pagina Impostazioni -> Problematiche con "Esegui controllo dati"
- [x] 6. Ridisegno pagina di accesso (desktop split + mobile)
- [x] 7. Verifica finale: Ordini e Analytics = 102.288,00 € marzo 2026 = database; accesso desktop/mobile OK

## Aperti da doc ottimizzazione precedente
- [x] Restyling pagina Provvigioni (stile scatto, card mobile senza scroll orizzontale)
- [x] Revisione grafica pagina Ordini (verifica responsive 320/375/430/desktop, nessun difetto)

## Doc "Migliorare il design di Ordini e Nuovo ordine"
- [x] Pagina Ordini: intestazione, barra filtri con filtri attivi, tabella computer, schede telefono
- [x] Nuovo ordine: stepper, riepilogo laterale su computer, selettore prodotti dedicato, righe prodotto, conferma con "Modifica"
- [x] iPhone: campi lunghi e menu di scelta dentro lo schermo, testo campi 16px, barra azioni in safe area
