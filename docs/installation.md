# Installazione

Questa guida descrive l’installazione manuale di Taxa Desk su Windows.

## Requisiti

- Windows 10 recente o Windows 11.
- Microsoft Edge WebView2 disponibile nel sistema.
- Permessi utente sufficienti per eseguire applicazioni scaricate.

## Download

Scarica l’ultima versione da:

[https://github.com/Heylucasabatino/taxa-desk/releases/latest](https://github.com/Heylucasabatino/taxa-desk/releases/latest)

Per la beta è consigliato il pacchetto portable:

```text
Taxa.Desk_0.1.3_windows_x64_portable.zip
```

L’installer Windows resta disponibile come canale alternativo:

```text
Taxa.Desk_0.1.3_x64-setup.exe
```

## Uso portable

1. Scarica lo ZIP portable.
2. Estrai tutta la cartella `Taxa Desk`.
3. Avvia `Taxa Desk.exe`.
4. Non cancellare `data/`, `backups/` o `logs/`.

La cartella portable contiene:

```text
Taxa Desk/
  Taxa Desk.exe
  Taxa Desk Updater.exe
  LEGGIMI.txt
  data/
  backups/
  logs/
```

## Installazione tramite installer

1. Scarica l’installer dalla pagina release.
2. Esegui l’installer.
3. Avvia Taxa Desk.
4. Apri `Dati & backup`.
5. Crea un backup JSON se hai già dati da conservare.

## Aggiornamento manuale

Se usi la versione portable, preferisci l’aggiornamento integrato da `Dati & backup`: l’app crea un backup locale, scarica il pacchetto update e aggiorna i file applicativi senza toccare `data/`, `backups/` e `logs/`.

Se preferisci aggiornare manualmente:

1. Apri `Dati & backup`.
2. Crea un backup JSON.
3. Scarica la nuova versione portable da GitHub Releases.
4. Chiudi Taxa Desk.
5. Estrai la nuova cartella.
6. Copia `data/`, `backups/` e `logs/` dalla vecchia cartella alla nuova.
7. Riapri Taxa Desk e verifica che i dati siano presenti.

La cartella `data/`, `backups/` e `logs/` non deve essere cancellata manualmente durante l’aggiornamento.

## Disinstallazione

Prima di disinstallare, crea un backup JSON dalla sezione `Dati & backup` e conservalo in una cartella scelta da te.

Se elimini manualmente la cartella locale dell’app, potresti eliminare anche database, backup e log.

## Problemi comuni

### Windows blocca l’app scaricata

Nelle build beta Windows può mostrare un avviso SmartScreen ("Windows ha protetto il PC") perché l’installer non è ancora firmato con un certificato Authenticode commerciale.

Per procedere:

1. Verifica di aver scaricato l’installer dalla pagina ufficiale [GitHub Releases](https://github.com/Heylucasabatino/taxa-desk/releases/latest).
2. Nell’avviso SmartScreen clicca **Ulteriori informazioni**.
3. Clicca **Esegui comunque**.

Se hai dubbi sull’origine del file, non eseguirlo: scaricalo nuovamente dalla pagina ufficiale.

### I dati non compaiono dopo un aggiornamento

Controlla di aver installato la versione corretta e di non aver cancellato la cartella `data/`. Se necessario, usa `Importa backup` dalla sezione `Dati & backup`.
