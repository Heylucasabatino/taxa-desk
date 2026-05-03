# Stato progetto

Aggiornato al 2026-05-03.

## Sintesi

Taxa Desk è una beta desktop Windows privacy-first per gestione locale di entrate, spese, accantonamenti, scadenze, obiettivi e backup JSON.

- Versione codice: `0.1.10`.
- Ultima release pubblica GitHub: `0.1.9`.
- Canale download consigliato in beta: portable ZIP.
- Canale installer: disponibile come alternativa, non principale.
- Database locale: SQLite nella cartella applicazione o nella cartella dati locale del bundle installer.
- Telemetria: assente.
- Backend applicativo: assente.

## Stato funzionale

Implementato:

- profilo fiscale iniziale e modifica successiva;
- movimenti di entrata/spesa con categorie locali;
- accantonamenti e stime annuali;
- obiettivi;
- scadenze personali;
- analisi e grafici locali;
- backup/import JSON;
- migrazione guidata tramite backup JSON;
- aggiornamento portable assistito con backup pre-update;
- updater Tauri ufficiale configurato per canale installer;
- feedback beta tramite link esterno configurabile.

## Aggiornamenti

Il controllo aggiornamenti resta manuale. L’app non esegue auto-update silenziosi e non invia dati fiscali, backup, contenuti SQLite o path locali.

Il canale portable è quello consigliato per la beta: l’app scarica un manifest statico da GitHub Releases, verifica SHA256 e firma minisign del pacchetto update, crea un backup JSON locale, chiude Taxa Desk, sostituisce solo i file applicativi e riapre l’app.

La release `0.1.10` non è ancora pubblicata perché per creare artifact updater validi serve una build firmata con:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

## Stato repo

La repo tracciata è snella e contiene solo sorgenti, configurazioni, documentazione, icone e screenshot pubblico essenziale.

Artifact locali rigenerabili non devono essere committati:

- `dist/`;
- `release-portable/`;
- `src-tauri/target/`;
- `node_modules/`;
- log locali;
- chiavi private updater.

## Rischi residui

- Windows SmartScreen continuerà a mostrare attrito finché l’app non avrà firma Authenticode.
- Prima di pubblicare `0.1.10` va rifatta una release firmata e testata da `0.1.9` a `0.1.10`.
- Il form feedback pubblico deve essere configurato con `VITE_FEEDBACK_URL` nelle build pubbliche.
- Le stime fiscali restano orientative e devono essere presentate come supporto operativo, non consulenza fiscale.

## Prossime priorità

1. Generare e pubblicare una release firmata `0.1.10`.
2. Testare update reale da `0.1.9` a `0.1.10` su una cartella portable con dati fittizi.
3. Configurare un form feedback pubblico stabile.
4. Valutare firma Authenticode prima di spingere la beta verso utenti non tecnici.
