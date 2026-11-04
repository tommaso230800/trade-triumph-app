# OneDrive completo e File e documenti

## Risultato
Trasformare File e documenti nel file manager dell’intero OneDrive aziendale: cartelle e file reali, dalla radice, con la stessa organizzazione. Le viste per azienda, cliente e categoria rimangono raggruppamenti virtuali, senza spostare gli originali.

L’integrazione attuale è soltanto una base: importa da una cartella, non conserva l’albero e non sincronizza quando l’app è chiusa. Queste parti verranno sostituite, non semplicemente rinominate.

## 1. Accesso e tutela dei documenti
- Verificare account Microsoft, permessi di lettura/scrittura e titolare autorizzato della connessione condivisa.
- Consentire l’accesso al drive soltanto agli utenti esplicitamente autorizzati; il solo accesso al gestionale non autorizza a leggere tutto OneDrive.
- Proteggere stato, avanzamento e registro dalle modifiche dirette degli utenti.
- Prima dell’analisi dell’intero archivio, mostrare una conferma per il trattamento dei documenti tramite AI e il consumo di crediti. La sincronizzazione dei file funziona anche senza analisi AI.
- Non modificare ordini, provvigioni, prezzi o condizioni durante sincronizzazione e verifiche.

## 2. Indice completo dalla radice
- Eliminare la selezione obbligatoria delle cartelle e usare la radice come unico perimetro.
- Registrare ogni file e cartella, compresi elementi non analizzabili dall’AI, conservando identificativi Microsoft, padre, nome, dimensione, versione e stato.
- Ricostruire percorsi e sottocartelle attraverso gli identificativi stabili, senza cartelle inventate.
- Elaborare tutte le pagine Delta Query in blocchi, salvando il punto di ripresa dopo ciascun blocco; nessun limite al totale degli elementi.
- Distinguere scansione in corso, completata, sospesa ed errore. Non dichiarare completato un archivio con pagine o operazioni pendenti.
- Conservare file distinti con contenuto identico: l’hash può evitare copie del contenuto, ma non eliminare elementi dall’albero OneDrive.

## 3. Sincronizzazione reale e automatica
- “Sincronizza ora” avvia o riprende la riconciliazione dell’intero drive e delle modifiche locali pendenti.
- Introdurre una coda persistente con blocco contro esecuzioni sovrapposte, tentativi, attesa indicata da Microsoft e ripresa degli errori.
- Usare notifiche Microsoft quando disponibili e verificarne sottoscrizione e rinnovo; aggiungere una riconciliazione periodica lato server come controllo di sicurezza, anche ad app chiusa.
- Se le notifiche non sono attivabili, rendere esplicita la frequenza del controllo periodico e il possibile ritardo, senza presentarlo come aggiornamento istantaneo.
- Mostrare conteggi reali acquisiti e operazioni pendenti; non inventare una percentuale prima di conoscere il totale.

## 4. File manager iPhone e computer
- Navigazione delle cartelle reali con percorso, ritorno al livello superiore, elenco/griglia e caricamento progressivo delle cartelle numerose.
- Ricerca per nome e contenuto, filtri azienda/cliente/tipo/data e viste intelligenti separate dalla struttura fisica.
- Anteprima, informazioni, download e apertura originale OneDrive; accesso al contenuto su richiesta, evitando di copiare permanentemente l’intero drive nel secondo archivio.
- Azioni: caricare nel percorso aperto, creare cartelle/sottocartelle, rinominare, spostare e sostituire file.
- Eliminazione con conferma esplicita prima della propagazione; gli elementi eliminati da OneDrive non vengono ricaricati automaticamente.
- Mantenere accessibili gli attuali documenti solo locali, senza caricarli in percorsi arbitrari; destinazione esplicita per il primo trasferimento.

## 5. Versioni, file grandi e conflitti
- Scritture condizionate alla versione Microsoft conosciuta: una modifica simultanea non deve sovrascrivere silenziosamente un’altra.
- Conservare entrambi i contenuti in conflitto e chiedere quale mantenere; mostrare le versioni recuperabili offerte da Microsoft.
- Implementare caricamenti grandi a blocchi riprendibili, con limiti reali documentati e verificati, senza l’attuale soglia fissa di 4 MB.
- Registrare errori di accesso e contenuti non disponibili senza considerarli trasferiti o analizzati.

## 6. Memoria documentale e collegamenti CRM
- Accodare automaticamente l’analisi dei file nuovi o cambiati compatibili, dopo autorizzazione al trattamento AI; mantenere visibili tutti gli altri formati.
- Riutilizzare lettura PDF, Word, immagini e fogli già presenti; gestire scansioni, tentativi e casi incerti senza inventare associazioni.
- Preservare correzioni manuali e alias verificati; usare tutte le anagrafiche accessibili, non solo aziende di esempio.
- Collegare virtualmente documenti ad aziende, clienti e registrazioni originali identificabili; nei casi ambigui richiedere conferma.
- Per listini proporre un confronto verificabile con approvazione esplicita; per proposte mantenere il percorso di accettazione esistente; per provvigioni distinguere mandante, intestatario e competenza.
- Ricerca in linguaggio naturale con fonti documentali e rispetto dei permessi, senza alterare dati commerciali.

## 7. Centro di controllo e verifiche
- Impostazioni OneDrive: account, drive, file/cartelle, ultima sincronizzazione, analisi pendenti, errori, conflitti e spazio.
- Comandi: Sincronizza ora, Riprova falliti, Verifica integrità, Rianalizza con AI e sospensione/ripresa.
- Test automatici per identità stabile, paginazione/ripresa, eliminazioni, autorizzazioni, conflitti e doppia sincronizzazione senza duplicati.
- Verificare le 15 condizioni della specifica: radice, annidamento, nuovi file, cartelle/caricamenti locali, rinomine/spostamenti, versioni, cancellazioni, classificazione, recupero errori, iPhone, app chiusa e conteggi completi.
- Usare dati reali in sola lettura e una cartella di prova chiaramente identificata per scritture autorizzate; non rinominare, spostare o eliminare documenti aziendali per test.
- Controllare 320/375/430 px e computer. La prova di caricamento dall’app OneDrive su iPhone reale richiede un file dell’utente: una simulazione via API non verrà dichiarata equivalente.
- Nel riepilogo finale separare ciò che è verificato, ciò che attende autorizzazione e ogni limite Microsoft o della piattaforma effettivamente riscontrato.

## Dettagli tecnici
- Un unico indice persistente del drive per identità `(drive_id, item_id)`, con relazione padre–figlio; collegamenti ai documenti CRM separati dall’identità fisica.
- Stato di scansione, cursore Delta, coda operazioni, versioni/conflitti e autorizzazioni protetti lato server con RLS e grant espliciti.
- Chiamate Microsoft esclusivamente tramite connettore Lovable lato server; nessun token o credenziale nel browser.
- Funzioni server condivise per sincronizzazione manuale e automatica; autenticazione dedicata dei callback e controllo autorizzazioni per ogni operazione.
- Migrazioni additive: preservare archivio esistente, associazioni manuali, PDF accettati e registrazioni commerciali.