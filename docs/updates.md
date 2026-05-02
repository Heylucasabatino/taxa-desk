# Aggiornamenti online assistiti

Taxa Desk supporta due canali di aggiornamento:

- **portable updater** per la cartella autonoma consigliata in beta;
- **Tauri updater ufficiale** per il canale installer NSIS.

Il canale portable è quello orientato all’utente non tecnico: l’utente clicca `Verifica aggiornamenti`, conferma, l’app crea un backup JSON locale, scarica il pacchetto update, chiude Taxa Desk, sostituisce solo i file applicativi e riapre l’app.

Il canale installer usa il plugin ufficiale Tauri updater v2 con un endpoint statico su GitHub Releases:

```text
https://github.com/Heylucasabatino/taxa-desk/releases/latest/download/latest.json
```

Il controllo aggiornamenti deve restare manuale e privacy-first: non invia dati fiscali, movimenti, contenuti SQLite, path locali, account o telemetria. Il client scarica solo i manifest di versione e, dopo conferma dell’utente, il pacchetto update o l’installer.

## Portable updater

Endpoint:

```text
https://github.com/Heylucasabatino/taxa-desk/releases/latest/download/portable-manifest.json
```

Manifest:

```json
{
  "version": "0.1.3",
  "notes": "Correzioni e miglioramenti.",
  "pubDate": "2026-05-02T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/Heylucasabatino/taxa-desk/releases/download/v0.1.3/Taxa.Desk_0.1.3_windows_x64_update.zip",
      "sha256": "<sha256 dello zip update>",
      "size": 1234567,
      "signature": "untrusted comment: ...\\nRWQl2pksntXC...\\ntrusted comment: timestamp:...\\n..."
    }
  }
}
```

Il campo `signature` contiene il testo minisign decodificato dal file `.sig` generato da `tauri signer sign`. Il file `.sig` prodotto da Tauri è base64: lo script `release:portable` lo decodifica prima di inserirlo nel manifest portable. Il portable updater verifica la firma con la stessa chiave pubblica usata dal Tauri updater installer (vedi `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`). Un manifest senza firma valida viene rifiutato e l'aggiornamento non parte.

Lo ZIP update contiene solo file applicativi sotto `app/`:

```text
app/
  Taxa Desk.exe
  fondi-e-tasse.exe
  Taxa Desk Agent.exe
  LEGGIMI.txt
```

Il nome legacy `fondi-e-tasse.exe` serve per migrare build gia' distribuite via installer o portable: gli helper vecchi riaprono l'eseguibile con lo stesso nome che ha lanciato l'app, quindi il pacchetto update deve sovrascrivere anche quel nome.

Non deve contenere `data/`, `backups/` o `logs/`.

La cartella portable completa per primo download contiene:

```text
Taxa Desk/
  Taxa Desk.exe
  Taxa Desk Updater.exe
  Taxa Desk Agent.exe
  LEGGIMI.txt
  data/
  backups/
  logs/
```

Il comando release genera entrambi e firma il pacchetto update:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="C:\Users\<utente>\.tauri\fondi-e-tasse\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password-se-presente>"
$env:VITE_FEEDBACK_URL="https://<form-pubblico-feedback>"
npm run release:portable
```

Senza `TAURI_SIGNING_PRIVATE_KEY` impostato, lo script si interrompe prima di scrivere il manifest: i pacchetti portable non firmati non sono ammessi.
Senza `VITE_FEEDBACK_URL`, gli script di release si interrompono: la beta pubblica deve sempre puntare a un canale feedback utilizzabile anche senza account GitHub.

## Chiavi updater

Genera una coppia di chiavi con Tauri CLI:

```powershell
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\fondi-e-tasse\updater.key"
```

La chiave pubblica generata va in `src-tauri/tauri.conf.json` sotto `plugins.updater.pubkey`.

Non committare mai:

- file `updater.key`;
- password della chiave;
- valori reali di `TAURI_SIGNING_PRIVATE_KEY`;
- valori reali di `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`;
- file `.env` o script locali che contengono segreti.

Per release locali o CI usa variabili d’ambiente:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="C:\Users\<utente>\.tauri\fondi-e-tasse\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password-se-presente>"
$env:VITE_FEEDBACK_URL="https://<form-pubblico-feedback>"
npm run tauri:build
```

Nota: il signer accetta anche `TAURI_SIGNING_PRIVATE_KEY_PATH`, ma la procedura interna preferisce documentare `TAURI_SIGNING_PRIVATE_KEY` come richiesto dal flusso release.

## Procedura release

1. Aggiorna la versione in `package.json`.
2. Aggiorna la versione in `src-tauri/tauri.conf.json`.
3. Aggiorna la versione in `src-tauri/Cargo.toml` se la crate Rust deve restare allineata.
4. Esegui i controlli:

```powershell
npm run build
npm run lint
npm test
```

5. Esegui la build firmata:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="C:\Users\<utente>\.tauri\fondi-e-tasse\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password-se-presente>"
npm run tauri:build
```

6. Verifica che `src-tauri/target/release/bundle/nsis/` contenga l’installer `.exe` e la firma `.sig`.
7. Genera `latest.json`:

```powershell
$env:GITHUB_REPOSITORY="Heylucasabatino/taxa-desk"
$env:RELEASE_TAG="v0.1.2"
$env:RELEASE_NOTES="Correzioni e miglioramenti."
$env:VITE_FEEDBACK_URL="https://<form-pubblico-feedback>"
npm run release:latest-json
```

Se hai usato una target dir esterna:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.tauri\fondi-e-tasse\target"
npm run release:latest-json
```

8. Pubblica una GitHub Release con tag coerente con la versione, ad esempio `v0.1.2`.
9. Carica sulla release:
   - installer NSIS `.exe`;
   - firma `.exe.sig`;
   - `latest.json`.
10. Genera e carica artifact portable:
   - `Taxa.Desk_X.Y.Z_windows_x64_portable.zip`;
   - `Taxa.Desk_X.Y.Z_windows_x64_update.zip`;
   - `portable-manifest.json`.

## Manifest latest.json

Per static GitHub Releases il manifest deve contenere una piattaforma Windows valida:

```json
{
  "version": "0.1.2",
  "notes": "Correzioni e miglioramenti.",
  "pub_date": "2026-05-01T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<contenuto del file .sig>",
      "url": "https://github.com/Heylucasabatino/taxa-desk/releases/download/v0.1.2/Taxa.Desk_0.1.2_x64-setup.exe"
    }
  }
}
```

`signature` deve contenere il contenuto della firma, non un path e non un URL.

## Test update

Scenario minimo da provare prima della distribuzione:

1. Installa una versione precedente, per esempio `0.1.0`.
2. Crea alcuni dati locali in `data/fondi-e-tasse.sqlite`.
3. Pubblica `latest.json` con versione superiore, per esempio `0.1.2`.
4. Apri `Dati & backup`.
5. Premi `Verifica aggiornamenti`.
6. Controlla che vengano mostrati versione installata, nuova versione e note.
7. Premi `Scarica e installa`.
8. Verifica che venga creato un backup JSON locale in `backups/`.
9. Verifica che l’installazione parta solo dopo backup riuscito.
10. Riapri l’app e controlla che `data/`, `backups/` e `logs/` siano ancora nella cartella locale.

Test manuali richiesti:

- verifica senza rete: mostra errore di rete comprensibile;
- nessun aggiornamento disponibile: stato `Nessun aggiornamento`;
- update disponibile: mostra changelog e pulsante di installazione;
- portable update: backup locale, download ZIP update, chiusura app, sostituzione file applicativi e riapertura;
- fallback manuale: `Apri pagina download` apre `https://github.com/Heylucasabatino/taxa-desk/releases/latest`;
- backup pre-update riuscito: path backup visibile;
- errore backup: installazione bloccata;
- messaggi privacy chiari.

## Migrazione portable -> installer

La migrazione dati e' documentata in `docs/migration.md`.

Regola operativa: per passare da portable a installer, preferire sempre backup JSON, anteprima e backup pre-import. Non copiare direttamente `data/fondi-e-tasse.sqlite` da una cartella all'altra.

## Limite installer

Il plugin updater Tauri aggiorna tramite gli artifact bundle supportati dalla piattaforma. Su Windows con target NSIS usa l’installer firmato e `installMode: "passive"`.

La distribuzione portable non usa il plugin Tauri updater per sostituire la cartella: usa un helper esterno che può aggiornare l’eseguibile dopo la chiusura dell’app. Le nuove build preferiscono `Taxa Desk Agent.exe`; `Taxa Desk Updater.exe` resta nella cartella completa per compatibilità con build già distribuite.
