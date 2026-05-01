# Taxa Desk

Il tuo spazio locale per entrate, tasse e scadenze.

Applicazione locale React/Vite/Tauri per tenere sotto controllo incassi, spese, accantonamenti fiscali/previdenziali, scadenze e obiettivi di risparmio. E pensata come strumento operativo personale, non come gestionale contabile completo.

## Funzioni principali

- Configurazione iniziale del profilo fiscale con coefficienti, aliquote e minimi contributivi.
- Registrazione di introiti e spese con stato reale o previsionale.
- Panoramica annuale di disponibile, previsionale, incassato, pagato e quota da accantonare.
- Stima di imposta sostitutiva, contributo soggettivo e contributo integrativo.
- Obiettivi con target, importo gia accantonato, scadenza e rata mensile stimata.
- Sezioni per movimenti, accantonamenti, scadenze, analisi, profilo fiscale e backup.

## Avvertenza fiscale

Le cifre sono stime orientative basate sui dati inseriti e sul profilo configurato. Scadenze, aliquote, minimi, proroghe e requisiti fiscali possono cambiare: prima di prendere decisioni o fare versamenti verifica sempre con commercialista, Agenzia Entrate ed ENPAP.

## Dati locali e backup

La build web resta compatibile con IndexedDB tramite Dexie, nel database locale `funds-and-taxes`. Non c'e sincronizzazione cloud o backend remoto.

La build desktop Tauri usa invece un database SQLite locale accanto all'eseguibile:

```text
Taxa Desk/
  Taxa Desk.exe
  data/fondi-e-tasse.sqlite
  backups/*.json
  logs/app.log
```

Il backup esporta un file JSON con movimenti, obiettivi, impostazioni fiscali e metadati di versione. L'importazione di un backup sostituisce movimenti e obiettivi locali dopo conferma; le impostazioni fiscali vengono aggiornate dal file importato.

## Comandi

Installa le dipendenze:

```bash
npm install
```

Avvia l'app in sviluppo:

```bash
npm run dev
```

Compila la build di produzione:

```bash
npm run build
```

Esegui il lint:

```bash
npm run lint
```

Anteprima locale della build:

```bash
npm run preview
```

Avvia la shell desktop Tauri in sviluppo:

```bash
npm run tauri:dev
```

Compila la build desktop:

```bash
npm run tauri:build
```

La build Tauri richiede la toolchain Rust installata. Su Windows serve un sistema moderno con Microsoft Edge WebView2 disponibile, normalmente presente su Windows 11 e sulle installazioni Windows 10 recenti.

## Limitazioni attuali

- Nessun account utente, sincronizzazione multi-dispositivo o salvataggio server.
- Nessuna validazione fiscale ufficiale: i calcoli dipendono dai parametri inseriti.
- Le scadenze sono promemoria statici e non intercettano proroghe o casi particolari.
- L'import backup non fonde i dati: sostituisce movimenti e obiettivi locali.
- Non gestisce fatturazione elettronica, documenti, IVA o adempimenti completi.
