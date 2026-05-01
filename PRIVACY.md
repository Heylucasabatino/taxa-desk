# Privacy

Taxa Desk è progettato come applicazione desktop locale e privacy-first.

## Dati trattati localmente

L’app può salvare sul dispositivo dell’utente:

- entrate, spese e relative note;
- obiettivi di risparmio;
- impostazioni fiscali inserite dall’utente;
- scadenze e preferenze locali;
- backup JSON esportati dall’utente;
- log tecnici locali dell’app.

Nella distribuzione desktop i dati sono salvati nella cartella locale dell’app, tipicamente:

```text
Taxa Desk/
  data/fondi-e-tasse.sqlite
  backups/*.json
  logs/app.log
```

## Cosa non fa l’app

Taxa Desk non introduce:

- account utente;
- autenticazione remota;
- backend applicativo;
- sincronizzazione cloud;
- telemetria;
- tracciamento analytics;
- caricamento online di movimenti, dati fiscali, backup o database SQLite.

## Aggiornamenti online

Il controllo aggiornamenti contatta GitHub Releases per scaricare solo informazioni sulla versione disponibile e, dopo conferma dell’utente, l’installer firmato.

Il controllo aggiornamenti non invia a GitHub contenuti fiscali, movimenti, backup, path locali o contenuti del database SQLite. Come per qualunque richiesta HTTP, GitHub e l’infrastruttura di rete possono ricevere dati tecnici minimi necessari alla connessione, come indirizzo IP e user agent.

Prima di installare un aggiornamento, Taxa Desk crea un backup JSON locale. Se il backup fallisce, l’installazione non procede.

## Backup

I backup JSON sono creati e conservati localmente. L’utente decide se copiarli, spostarli, eliminarli o conservarli su supporti esterni.

## Responsabilità dell’utente

L’utente resta responsabile della custodia del dispositivo, dei backup e di eventuali copie esportate. Per dati sensibili si consiglia di proteggere Windows con password, cifratura disco e backup periodici.

## Contatti

Per segnalazioni privacy o richieste sul trattamento dei dati usa i contatti indicati nel profilo GitHub del progetto. Non pubblicare dati fiscali reali, backup completi o contenuti del database SQLite nelle issue.
