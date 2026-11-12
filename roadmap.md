# Roadmap

## Centro notifiche e notifiche push (12 novembre)
- [ ] Archivio notifiche per utente, letture sincronizzate, preferenze per categoria
- [ ] Dispositivi: attivazione su tocco, stati, prova, invio a tutti i dispositivi abilitati
- [ ] Nuovo ordine: avviso unico al salvataggio confermato, apertura dettaglio ordine
- [ ] Ordine inviato: avviso solo dopo esito positivo Gmail, nessun duplicato
- [ ] Riordino in ritardo: stesso calcolo della pagina Riordino, tolleranza condivisa, un avviso per ciclo, controllo programmato Europe/Rome
- [ ] Campanella con non lette, voce menu, Diagnostica notifiche
- [ ] Verifiche: importo, invio fallito, riordino, duplicati, accesso protetto; prove su dispositivi reali da fare con l’utente

## Agenzia condivisa, accesso username, ordini ed email (12 novembre)
- [ ] Backup: non creato in automatico; consigliata esportazione manuale prima di altre modifiche strutturali (serve azione del titolare)
- [x] Struttura agenzia: membri, proprietario dati, regole di accesso condivise; colleghi vedono gli stessi ordini (Gabriele 466 ordini 2026, Tommaso 468 incl. 2 di account esterni visibili solo all’amministratore)
- [x] Login username/password (maiuscole indifferenti nello username), blocco tentativi, logout, cambio password, recupero; provato accesso Gabriele su iPhone
- [x] Account Gabriele, Andrea, Tommaso (collegato all’esistente)
- [x] Funzioni di invio email, OneDrive, archivio e import prodotti puntano ai dati condivisi
- [x] Ordini: autore/modifica registrati, controllo versione
- [ ] Mittente unico agenziamazzigroup@gmail.com: blocco attivo e visibile; serve collegare la casella dell’agenzia (ora collegata tommasosalti@gmail.com)
- [x] Rimossi Locandine e proposte + Fiscalità e netto da menu, ricerca e collegamenti; storico conservato
- [x] Modulo ordine in 4 sezioni, CARTONI/PEZZI TOTALI in evidenza, sfusi, omaggi, bozze automatiche, uscita protetta, conferma eliminazione, controlli righe; verificato 390px e computer
- [x] Rubrica email per azienda + suggerimenti A/CC con chip e anti-duplicati; verificata composizione senza invio
- [x] Analytics: rimosso “Sconto merce/ordine”
- [x] Statistiche prodotti con filtri, totali dal database e confronto dinamico; 2026 riconciliato (937.742,68 € su righe + 480,85 € senza dettaglio)
- [x] Controllo dati: nuova segnalazione righe con pezzi sfusi pari al totale cartoni (14 ordini storici da verificare)
- [ ] Invio email reale di prova: richiede casella agenzia collegata e destinatario autorizzato

## Riordino dal 1° gennaio 2026
- [x] Limite condiviso applicato a coppie, prodotti, grafici e avvisi; cache distinta per periodo. 47 test superati, compresi 1° gennaio incluso, esclusione 2025 e anni successivi; compilazione automatica OK. Nessun dato commerciale modificato. Verifica autenticata live non disponibile: accesso gestito non corrisponde all’utente richiedente.

## Prevenzione errore GHILLI su tutto il portafoglio
- [x] Dati aggiornati: 1193 ripartizioni coinvolgevano 101 coppie/65 clienti; ora escluse dalla cronologia. Ricalcolo 115 coppie: zero incoerenze. Analisi cliente–azienda allineata, scheda cliente rispetta ritardo oltre tolleranza e N/D.
- [x] Test permanenti multi-cliente/multi-mandante su contaminazione e storico insufficiente; 134 test superati. Scheda GHILLI autenticata: 2 ordini, N/D, nessun falso ritardo; anteprima aggiornata dopo rilevazione moduli obsoleti, nessun errore runtime.

## Correzione frequenze verificabili (4 novembre)
- [x] Ricostruire GHILLI–Quattro Valli: 11 ripartizioni 2025 non documentate + 2 acquisti 2026, intervallo reale 144 gg; baseline 31 derivava dalle ripartizioni mensili
- [x] Frequenza operativa adattiva, affidabilità, prodotti e avvisi condivisi; nessun ordine o intervento modificato
- [x] Trasparenza cronologia/intervalli/esclusioni, grafico con riferimenti temporali e collegamenti per ID; report in Riordino
- [x] Test A–F e ricalcolo read-only: 1653 ordini / 1384 righe / 115 coppie, 428 validi, 1193 ripartizioni escluse solo dalla cronologia, 30 annullati e 2 senza coppia; zero incoerenze, 127 test OK; verifica autenticata GHILLI e 320/375/430 px

## Memoria attiva documenti (2 novembre)
- [x] Cartelle virtuali per azienda con le 9 categorie; collegamenti multi-azienda senza duplicare il file; vista generale filtrabile
- [x] Caricamento unico multiplo con coda per file: l'analisi continua anche se un file fallisce; stati In elaborazione/Archiviato/Da verificare/Errore con riprova
- [x] Riconoscimento dal contenuto (PDF, immagini, fogli, testo) con ruoli fornitore/cliente/trasportatore; alias verificati salvati a ogni correzione manuale e riusati nei riconoscimenti successivi
- [x] Scheda documento: titolo, riepilogo, data documento distinta dal caricamento, numero, validità, parole chiave, testo estratto; versioni collegate per stesso numero documento
- [x] Ricerca nel contenuto dall'archivio e dalla ricerca interna (⌘K); assistente AI cita i documenti rilevanti con fonte e data
- [x] Verificato: PDF Polara → "Proposta Commerciale Polara 2026" con riepilogo e keyword, associazione manuale preservata; 375px senza overflow; build OK
- [ ] Analisi completa dell'archivio esistente: avviare "Analizza archivio" con conferma dell'utente (16 documenti, usa crediti AI)
- [x] OCR su scansioni (lettura visiva se il PDF non ha testo) e Word .docx

## Fiscalità e netto (31 ottobre)
- [x] Fonte condivisa paginata, nessun incasso presunto, dettagli originali e ricevute incrementali protette implementati; lettura autenticata verificata
- [x] Quattro anagrafiche/profili persistenti; mandati con decorrenza, selezione multipla, anteprima e correzione storica esplicita implementati
- [x] Calcolo annuale 2026 standard INPS/Enasarco e imposte con N/D per parametri mancanti; cassa distinta; riferimenti 2024/2025 persistiti senza movimenti
- [x] Filtri e collegamenti verificati, apertura registrazione originale e dichiarazione 2025; 38 test; 375/390/393/430 senza overflow; compilazione automatica riuscita
- [ ] Attribuire aziende/storico e verificare salvataggio incassi reali: servono intestatari, decorrenze e un incasso reale autorizzato; nessun movimento economico creato per prova
- [ ] Calcoli personali completi: servono CF/P.IVA, nome del padre, posizione INPS/agevolazioni, contributi versati, costi, altri redditi e domicilio; riduzione 35% non calcolata finché non verificata
- [ ] SAS e simulazioni complete: configurazione soci/quote e calcolo societario non completati; confronto ordinario segnala dati mancanti, non produce un risultato definitivo
- [ ] Estrazione fiscale documenti con conferma pagina/campo: disponibili archivio e collegamento manuale, estrazione dedicata non completata

## Aggiornamento archivio, proposte, locandine e riordino (28 ottobre)
- [x] Archivio/proposte ridisegnati: filtri richiudibili, anteprime, tipi, date, ordinamento e azioni iPhone
- [x] Tre prodotti reali e prezzo 0,55 salvato/riaperto/PDF; listino invariato; export vuoto bloccato; PDF 36 righe con 2 intestazioni
- [x] Locandine prezzo/omaggio/combinate esportate PDF e PNG 1654×2339; logo proporzionato; foto ufficiali Limonata Bio 27,5cl e Bitter Lemon 20cl, caricamento/sostituzione manuale
- [x] Eliminazione persistente proposta/locandina verificata dopo ricarica; rimozione logica protegge storico accettato e conserva file condivisi; prove rimosse dagli elenchi
- [x] Analisi autenticata contenuto PDF/immagini/testo/fogli, matching identità e candidati; PDF Polara riconosciuto, Elba assente segnalato; correzione manuale conservata dopo rianalisi
- [x] Home/Riordino/avvisi usano ordini completi per coppia cliente–azienda: Calonaci–Casoni 29/09/2026, 29 giorni, 2.478,97 €, media 33 giorni; Ordini filtrati verificati
- [x] 32 test superati; quattro pagine e modulo a 375/390/393/430px senza overflow/errori; tastiera Safari reale non verificata
- [ ] Accettazione e modifiche/importazioni/annullamenti reali: richiedono condizioni e ordine autorizzati; verificati soltanto motore/regressioni senza alterare acquisti
- [ ] Archivio: scansione, Casoni–Calonaci, catalogo e Word da verificare con documenti reali specifici; Word non supportato dall’analisi automatica attuale
- [ ] Foto degli altri prodotti: variante/formato affidabili da verificare; disponibili caricamento manuale e segnalazione foto mancante

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

## Integrazione OneDrive + memoria attiva AI (4 novembre)
- [x] Fase 2: account Microsoft 365 collegato (OneDrive business, 6,6/10 GB); credenziali verificate lato server
- [x] Fase 3: funzione onedrive-sync distribuita — delta query, import con hash SHA-256 anti-duplicato, cestino logico (nessuna cancellazione distruttiva), anti-ciclo via etag, conflitti marcati, registro eventi, centro controllo in Impostazioni, push CRM→OneDrive con cartella per azienda (max 4 MB), badge e azioni OneDrive nell'archivio. Testata: status e browse OK (117 elementi radice)
- [x] Requisito sostituito: intero drive dalla radice, senza selezione cartelle; prima scansione completata (29 pagine)
- [ ] Fase 4: pipeline AI estesa (Word e OCR scansioni FATTI; restano confidenza 90/70, elaborazione a blocchi)
- [ ] Fase 5: collegamenti CRM (ordini, listini con revisione prezzi, proposte→Canvass, provvigioni)
- [ ] Fase 6: ridisegno File e Documenti (KPI, vista cartelle/elenco, scheda dettaglio, ricerca AI)
- [ ] Fase 7: test end-to-end senza cancellare/spostare file reali

## OneDrive totale — nuova specifica (4 novembre)
- [x] Autorizzazioni esplicite per connessione condivisa e consenso analisi dei documenti riservati; accesso limitato al titolare amministratore già configurato
- [x] Indice completo file/cartelle, ID stabili e scansione delta riprendibile senza limite totale: 2.395 file / 498 cartelle, nessun cursore pendente, zero duplicati
- [x] Controllo automatico ogni ora configurato, avanzamento reale e riprova errori; esecuzione pianificata ad app chiusa ancora da osservare
- [ ] File manager speculare: percorsi, elenco/griglia, caricamento, cartelle, rinomina, spostamento, sostituzione e cancellazione confermata
- [ ] Versioni/conflitti, file grandi e accesso originali senza duplicazione permanente
- [ ] Analisi automatica compatibile, collegamenti CRM virtuali e confronto listini approvato
- [ ] Controllo integrità, conteggi reali e test delle 15 condizioni richieste
- [x] File manager: radice e cartelle reali paginati, elenco/griglia, ricerca nomi, download originali, creazione/rinomina/spostamento accodati, conferma eliminazione file e versioni Microsoft
- [x] Verifiche reali: cartella prova creata/rinominata/eliminata (prima del blocco conservativo sulle cartelle), Polara 30 elementi, 320/375/430 senza overflow; 13 test superati
- [ ] Caricamenti/sostituzioni riprendibili oltre 20 MB: serve percorso upload-session compatibile con il gateway, non documentato nella guida disponibile
- [ ] Notifiche Microsoft e rinnovo: non attivate; controllo orario come fallback esplicito
- [ ] Analisi completa con AI: attende consenso trattamento in Impostazioni; automatismo attuale per PDF/immagini/testo, Word/fogli da estendere lato server
- [ ] Confronto listini, collegamenti fiscali verificati e ricerca a domande: non completati
- [ ] Test scrittura file/upload/sostituzione/spostamento e iPhone reale: da completare; nessun documento commerciale modificato per prova

## Restyling premium + Intelligence riordini (4 novembre)
- [x] Motore statistico `reorderIntelligence.ts`: mediana/baseline separata dalla frequenza recente, tolleranza 5-7 gg, rallentamento anomalo/persistente/in recupero, calo volumi distinto, prodotti non riordinati (min. 3 acquisti), affidabilità, priorità con motivi
- [x] 13 test sulle condizioni della specifica (regolare, ritardo, 50 gg, 50+52, permanenza dopo nuovo ordine, rientro progressivo, prodotto fermo, calo volumi, storico insufficiente); 116 test totali OK
- [x] Grafici recharts: frequenza con baseline/tolleranza/zone anomale e tooltip, consumi con unità cartoni/pezzi/valore, portafoglio storico ricalcolato mese per mese, previsione con finestra e incertezza esplicita
- [x] Pagina Riordino: 8 KPI cliccabili, centro allarmi a 6 sezioni con motivi numerici, card cliente-azienda con grafici/crea ordine, filtri combinabili, ricalcolo manuale, tolleranza configurabile
- [x] File e documenti: dashboard compatta con numeri reali (OneDrive 2395 file/498 cartelle, CRM 2411, analisi AI 69, da verificare 2316)
- [x] Locandine e proposte: dashboard stati cliccabile (bozza/inviata/accettata/rifiutata/scaduta) + conteggi per tipo
- [x] Verificato: 390/1280 px senza overflow, dettaglio grafici iPhone OK, nessun dato fittizio, enum order_status corretto (no bozza/da_confermare)
- [ ] Esportazione grafico in immagine/PDF: non implementata
- [ ] Zoom temporale dei grafici: disponibile selezione ultimi 5/10/20/tutto, zoom a trascinamento non implementato
- [ ] Storico persistente delle segnalazioni: gli stati passati sono ricalcolati on-demand, non archiviati in tabella
