# Migrazione dati portable -> installer

Taxa Desk deve permettere a un utente di iniziare con la cartella portable e passare in seguito all'installer senza perdere i dati locali.

## Principio

La migrazione resta privacy-first:

- legge solo file locali scelti dall'utente;
- non carica online backup, database SQLite, path locali o dati fiscali;
- non modifica il file sorgente selezionato;
- crea un backup JSON dell'archivio attuale prima di importare;
- sostituisce i dati solo dopo anteprima e conferma.

## Flusso attuale

La prima versione implementata usa il backup JSON:

1. L'utente apre `Dati & backup`.
2. Nella sezione `Migrazione dati` seleziona `Importa dati da backup`.
3. Tauri apre un file picker nativo limitato ai file `.json`.
4. Il backend Rust valida il file con `inspect_backup_file`.
5. L'app mostra un'anteprima con movimenti, obiettivi, categorie, scadenze e profilo fiscale.
6. Alla conferma, `import_backup_file` crea un backup `pre-import-*.json` dell'archivio attuale.
7. Solo dopo il backup riuscito, l'app importa il file selezionato.

Il file sorgente resta nella sua posizione e non viene modificato.

## Comandi Tauri

- `inspect_backup_file(path)`: valida il backup JSON e restituisce un'anteprima.
- `import_backup_file(path)`: rilegge e rivalida il backup, crea il backup pre-import e importa i dati.

La rilettura nel comando di import e' intenzionale: evita di fidarsi di uno stato frontend vecchio se il file cambia tra anteprima e conferma.

## Permessi

Il frontend usa `@tauri-apps/plugin-dialog` solo per scegliere il file.
La lettura e l'import avvengono nel backend Rust, tramite comandi applicativi controllati.

Capability richiesta:

```json
"dialog:default"
```

## Cosa evitare

Non copiare direttamente:

```text
data/fondi-e-tasse.sqlite
```

Motivi:

- SQLite puo' avere file `-wal` e `-shm`;
- la portable potrebbe essere aperta;
- lo schema potrebbe essere vecchio;
- una copia diretta puo' perdere modifiche recenti o sovrascrivere dati esistenti.

Il percorso sicuro resta backup JSON -> anteprima -> backup pre-import -> import.

## Prossimo passo

La fase successiva potra' aggiungere `Importa da cartella portable`:

1. directory picker;
2. ricerca di `backups/*.json`;
3. proposta del backup piu' recente;
4. fallback a SQLite in sola lettura solo se non esistono backup JSON.

Anche quel flusso deve passare da anteprima e backup pre-import.
