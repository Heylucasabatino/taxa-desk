# Checklist release

Questa checklist va completata prima di pubblicare una nuova release di Taxa Desk.

## Versioni

- [ ] Aggiornare `package.json`.
- [ ] Aggiornare `package-lock.json` se necessario.
- [ ] Aggiornare `src-tauri/tauri.conf.json`.
- [ ] Aggiornare `src-tauri/Cargo.toml` se la versione crate deve restare allineata.
- [ ] Aggiornare note release e changelog breve.

## Controlli locali

```powershell
npm run build
npm run lint
npm test
```

## Build desktop

Usare una target directory fuori da OneDrive se la build locale non riesce a scrivere in `src-tauri/target`:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.tauri\fondi-e-tasse\target"
$env:TAURI_SIGNING_PRIVATE_KEY="$env:USERPROFILE\.tauri\fondi-e-tasse\updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password-se-presente>"
npm run tauri:build
```

Verificare che siano prodotti:

- installer `.exe`;
- firma `.exe.sig`;
- artifact updater richiesti da Tauri.

## Manifest updater

```powershell
$env:GITHUB_REPOSITORY="Heylucasabatino/taxa-desk"
$env:RELEASE_TAG="vX.Y.Z"
$env:RELEASE_NOTES="Sintesi breve della release."
npm run release:latest-json
```

Controllare che `latest.json` contenga:

- versione corretta;
- `pub_date` valida;
- URL GitHub Release corretto;
- firma corrispondente al file `.sig`.

## Test manuali

- [ ] Avvio app.
- [ ] Creazione dati di prova.
- [ ] Export backup JSON.
- [ ] Import backup JSON.
- [ ] `Verifica aggiornamenti` senza rete.
- [ ] Stato nessun aggiornamento disponibile.
- [ ] Stato aggiornamento disponibile con changelog.
- [ ] Backup automatico pre-update riuscito.
- [ ] Errore backup blocca installazione.
- [ ] Pulsante `Apri pagina download`.
- [ ] Messaggi privacy chiari.

## Pubblicazione GitHub

- [ ] Creare tag `vX.Y.Z`.
- [ ] Creare GitHub Release.
- [ ] Caricare installer `.exe`.
- [ ] Caricare `.exe.sig`.
- [ ] Caricare `latest.json`.
- [ ] Verificare URL:

```text
https://github.com/Heylucasabatino/taxa-desk/releases/latest/download/latest.json
```

- [ ] Verificare che l’installer sia scaricabile.
- [ ] Aggiornare README se cambiano requisiti o installazione.

## Dopo la release

- [ ] Installare una versione precedente.
- [ ] Aggiornare dalla versione precedente alla nuova.
- [ ] Verificare conservazione di `data/`, `backups/` e `logs/`.
- [ ] Annotare eventuali problemi nella release o nelle issue.
