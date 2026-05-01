# Aggiornamenti online assistiti

Taxa Desk usa il plugin ufficiale Tauri updater v2 con un endpoint statico su GitHub Releases:

```text
https://github.com/Heylucasabatino/taxa-desk/releases/latest/download/latest.json
```

Il controllo aggiornamenti deve restare manuale e privacy-first: non invia dati fiscali, movimenti, contenuti SQLite, path locali, account o telemetria. Il client scarica solo il manifest `latest.json` e, dopo conferma dell'utente, l'installer firmato.

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

Per release locali o CI usa variabili d'ambiente:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="C:\Users\<utente>\.tauri\fondi-e-tasse\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password-se-presente>"
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

6. Verifica che `src-tauri/target/release/bundle/nsis/` contenga l'installer `.exe` e la firma `.sig`.
7. Genera `latest.json`:

```powershell
$env:GITHUB_REPOSITORY="Heylucasabatino/taxa-desk"
$env:RELEASE_TAG="v0.1.2"
$env:RELEASE_NOTES="Correzioni e miglioramenti."
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
9. Verifica che l'installazione parta solo dopo backup riuscito.
10. Riapri l'app e controlla che `data/`, `backups/` e `logs/` siano ancora nella cartella locale.

Test manuali richiesti:

- verifica senza rete: mostra errore di rete comprensibile;
- nessun aggiornamento disponibile: stato `Nessun aggiornamento`;
- update disponibile: mostra changelog e pulsante di installazione;
- backup pre-update riuscito: path backup visibile;
- errore backup: installazione bloccata;
- messaggi privacy chiari.

## Limite portable

Il plugin updater Tauri aggiorna tramite gli artifact bundle supportati dalla piattaforma. Su Windows con target NSIS usa l'installer firmato e `installMode: "passive"`.

La distribuzione portable a cartella resta supportata per dati e backup locali, ma l'update in-place di una semplice cartella portable non e' un flusso garantito dal plugin updater. Se nei test reali l'installer NSIS non preserva bene l'esperienza portable desiderata, usare un flusso assistito alternativo:

1. creare sempre backup JSON locale;
2. scaricare o aprire la pagina GitHub Release;
3. mostrare istruzioni UI per chiudere l'app e sostituire solo i file applicativi;
4. non toccare `data/`, `backups/` e `logs/`.

Questo mantiene il controllo all'utente e non introduce backend custom o telemetria.
