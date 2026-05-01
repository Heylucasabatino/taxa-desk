# Roadmap Tauri Portable + SQLite Locale

## Obiettivo

Trasformare la webapp React/Vite in una app desktop portable per Windows, privacy-first e senza backend, con dati salvati in un file SQLite locale controllabile dall’utente.

Target finale:

```text
Taxa Desk/
  Taxa Desk.exe
  data/
    fondi-e-tasse.sqlite
  backups/
    backup-2026-04-30.json
  logs/
    app.log
```

La UI React resta la base dell’app. IndexedDB/Dexie resta come fallback web/dev e come sorgente di migrazione tramite backup JSON.

## Decisioni fissate

- Desktop runtime: Tauri 2.
- Storage desktop: SQLite locale gestito da Rust diretto, non `tauri-plugin-sql`.
- Distribuzione iniziale: Windows portable/cartella zip, non cloud e non Docker.
- Dati primari: `data/fondi-e-tasse.sqlite`.
- Recovery e migrazione: backup JSON versione 3, compatibile con il formato attuale.
- ID record: UUID testuali (`TEXT PRIMARY KEY`) per continuità con IndexedDB e backup.
- Cifratura: esclusa dalla prima versione desktop.
- Telemetria, sync, autenticazione, backend: esclusi.

## Fasi operative

### 1. Scaffold Tauri

- Aggiungere `src-tauri/` con configurazione Tauri 2.
- Far caricare la build React/Vite dentro una finestra desktop.
- Documentare requisito Windows: Windows 10 moderno o Windows 11 con Microsoft Edge WebView2.

Criterio di accettazione: `npm run tauri dev` apre la UI esistente in una finestra desktop su una macchina con toolchain Rust installata.

### 2. Portable path

- Risolvere la cartella base con `std::env::current_exe().parent()`.
- Creare `data/`, `backups/`, `logs/`.
- Eseguire un `.write-test` per verificare che la cartella sia scrivibile.
- Esporre un comando diagnostico che ritorna path exe, path dati, path backup, path log e stato scrivibilità.

Criterio di accettazione: al primo avvio vengono create le cartelle accanto all’exe, oppure l’app mostra un errore chiaro se la posizione non è scrivibile.

### 3. Storage adapter frontend

- Introdurre un contratto storage TypeScript per dati app, CRUD, import/export e diagnostica.
- Mantenere due implementazioni:
  - `dexieStorage` per browser/dev.
  - `tauriStorage` per desktop.
- Rimuovere dalle componenti l’accesso diretto a Dexie.

Criterio di accettazione: la build web continua a funzionare con Dexie, mentre la build Tauri usa comandi desktop.

### 4. SQLite desktop

- Creare schema SQLite per movimenti, obiettivi, profilo fiscale, categorie e meta.
- Implementare migrazioni idempotenti in Rust.
- Abilitare `PRAGMA foreign_keys = ON` e `PRAGMA journal_mode = WAL`.
- Implementare comandi Tauri per lettura/scrittura dati.

Criterio di accettazione: inserire/modificare/eliminare un movimento aggiorna il file SQLite e la UI.

### 5. Migrazione e backup

- Riutilizzare backup JSON versione 3 come formato di import/export.
- Importare backup in transazione, sostituendo i dati locali dopo conferma UI.
- Creare backup automatici:
  - all’avvio, se ci sono dati;
  - dopo modifiche con debounce;
  - alla chiusura quando possibile.
- Scrivere backup in modo atomico: file `.tmp`, flush, rename finale.
- Rotazione iniziale: ultimi 7 backup giornalieri + ultimi 4 settimanali.

Criterio di accettazione: un backup esportato dalla versione web può essere importato nella versione desktop e viceversa.

### 6. Logging e recovery

- Scrivere log in `logs/app.log`.
- Loggare avvio, path usati, migrazioni, backup, import ed errori SQLite.
- Mostrare messaggi UI semplici e non tecnici.

Criterio di accettazione: in caso di errore storage esiste un log locale utile per diagnosi.

### 7. Packaging portable

- Generare build desktop Windows.
- Preparare una cartella zip portable con exe e istruzioni minime.
- Evitare installer come canale principale finché il modello portable non è validato.

Criterio di accettazione: la cartella copiata in un’altra posizione continua ad avviarsi e a usare il proprio `data/`.

## Rischi e mitigazioni

- Cartella accanto all’exe non scrivibile: rilevazione con `.write-test`, messaggio chiaro e futuro selettore cartella dati.
- WebView2 mancante: documentare requisito Windows 10 moderno/Windows 11.
- Perdita dati da bug di migrazione: import/export JSON e backup automatico prima delle operazioni distruttive.
- Corruzione backup per crash: scrittura atomica `.tmp` + rename.
- Divergenza web/desktop: storage adapter unico e test condivisi sul formato backup.
- OneDrive/chiavette: loggare path effettivi e testare scrittura prima di aprire il DB.

## Test plan

- `npm run test`
- `npm run build`
- `npm run tauri dev` su macchina con Rust installato.
- Primo avvio desktop crea `data/`, `backups/`, `logs/`.
- Inserimento, modifica, cancellazione e ripristino record aggiornano UI e SQLite.
- Export JSON desktop importabile nella build web.
- Export JSON web importabile nella build desktop.
- Backup automatico prodotto dopo modifiche e leggibile come JSON.
- Avvio da cartella diversa usa il `data/` della nuova cartella.
- Cartella non scrivibile produce errore controllato.
