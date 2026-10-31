# Fiscalità e netto collegata alle provvigioni

## Risultato
Una pagina «Fiscalità e netto» alimentata dalle stesse registrazioni di Provvigioni, con attribuzioni fiscali storiche, incassi parziali e calcoli annuali separati per soggetto. Nessun nuovo ordine o incasso verrà creato per far coincidere i totali dichiarati.

## 1. Un’unica fonte per provvigioni e incassi
- Condividere tra le due pagine l’elenco completo delle provvigioni da ordini, scadenziario e movimenti, distinguendo le provvigioni stimate dagli importi documentati e controllando le sovrapposizioni fra ordine e fattura.
- Separare competenza, fattura della provvigione, incasso e periodo contributivo. Le fatture dei clienti non diventano automaticamente fatture dell’agente.
- Conservare ogni incasso parziale con data, quota lorda fiscalmente rilevante, trattenute e accredito. Gli importi cumulativi già presenti saranno riconosciuti una sola volta; informazioni ambigue o incomplete resteranno «Da verificare».
- Collegare i documenti nell’archivio esistente e aggiornare entrambe le pagine dopo inserimento, modifica, eliminazione, incasso e correzione fiscale.

## 2. Intestatari e mandati storici
- Creare quattro anagrafiche distinte: Tommaso Salti, padre di Tommaso (nome modificabile), Gabriele Mazzi e Mazzi Group SAS, con codice fiscale e partita IVA quando disponibili.
- Integrare scelta e filtro dell’intestatario nell’elenco, nella creazione e nella scheda Azienda; consentire assegnazioni multiple con decorrenza e anteprima.
- Mantenere i mandati con validità temporale e attribuire le nuove provvigioni secondo la competenza. Le aziende esistenti resteranno «Da assegnare» fino a una scelta esplicita.
- I cambi attuali non riscriveranno il passato; le correzioni storiche richiederanno un’azione distinta e l’anteprima delle registrazioni coinvolte.

## 3. Profili annuali e calcoli
- Configurare Tommaso come individuale forfettario, ATECO 46.17.07, coefficiente 62% e aliquota indicata 15%; lasciare da confermare la riduzione INPS del 35% per il 2026.
- Configurare padre e Gabriele come ordinari, con contabilità, altri redditi, costi, previdenza e domicilio da completare. Mantenere la SAS separata, con soci e quote documentati: Tommaso non sarà inserito come socio.
- Calcolare il forfettario sugli incassi fiscalmente rilevanti dell’anno e dedurre soltanto i contributi obbligatori fiscalmente deducibili effettivamente versati. Le spese reali incideranno sulla disponibilità, non saranno dedotte analiticamente dall’imponibile forfettario.
- Gestire Enasarco agente, mandante, trattenute e versamenti separatamente, con progressivi e limiti annuali per rapporto; mantenere FIRR separato e impedire doppie sottrazioni.
- Calcolare INPS e imposte sulla posizione annuale complessiva del soggetto. Mandante, trimestre e mese filtreranno i dettagli e le quote gestionali senza riavviare minimali, massimali o scaglioni.
- Parametri ufficiali corredati da fonte e anno; se mancano dati indispensabili, mostrare N/D o un risultato dichiaratamente parziale, non una stima presentata come definitiva.

## 4. Pagamenti, documenti e riferimenti storici
- Separare carico fiscale/contributivo annuale dalle uscite di cassa, con saldi, acconti, compensazioni, spese e somme già accantonate.
- Calcolare l’accantonamento residuo evitando di sommare gli acconti come seconda imposta o richiedere nuovamente Enasarco già trattenuta.
- Collegare dichiarazioni, prospetti, rendiconti, fatture e F24 a soggetto e periodo. I dati estratti richiederanno conferma con riferimento a pagina/campo; un F24 predisposto non attesterà un pagamento.
- Conservare i valori 2024/2025 forniti come riferimenti da dichiarazione, mostrando le differenze rispetto ai dati dell’app senza generare provvigioni o incassi.

## 5. Pagina e dettagli
- Vista iniziale Tommaso, filtri soggetto/anno/mese o trimestre/mandante/mandato.
- Mostrare maturato, fatturato, incassato, residuo, contributi, imposte, spese, netto economico, disponibilità di cassa, accantonamento e dati mancanti.
- Ogni totale aprirà registrazioni, formule, basi, aliquote, fonti e stato del dato, con collegamento alla voce originale in Provvigioni.
- Aggiungere simulazioni «aggiungo/tolgo una mandante» e «forfettario vs ordinario», con ipotesi esplicite e senza modificare il profilo reale.
- Schede espandibili e controlli leggibili su iPhone; accesso diretto anche da Provvigioni e dal menu.

## Dettagli tecnici
- Estendere in modo additivo le registrazioni esistenti e introdurre soltanto anagrafiche fiscali, mandati/versioni, dettagli degli incassi e configurazioni/pagamenti fiscali necessari; nessuna seconda tabella di provvigioni.
- Operazioni sensibili atomiche e autorizzate dal proprietario, con controlli sui collegamenti fra soggetto, mandato, azienda, documento e registrazione. Tabelle protette per utente con permessi espliciti.
- Motore di calcolo condiviso e testabile, caricamenti paginati e invalidazione coordinata dei dati delle due pagine. Calcoli annuali prima dei filtri locali.

## Verifiche
- Test per incassi a cavallo d’anno, pagamenti parziali, assenza di date/importi, nessun incasso presunto, doppioni e cambi di intestazione.
- Test sul 62% e sulle aliquote dichiarate, contributi deducibili realmente versati, limiti Enasarco per rapporto, INPS annuale unico, acconti e trattenute non duplicati, esclusione di Tommaso dalla SAS.
- Verifica autenticata dei collegamenti e aggiornamenti, più controlli a 375/390/393/430 px e computer.
- Nessun movimento economico reale modificato per prova; casi che richiedono dati personali o documenti mancanti resteranno esplicitamente da completare.