# Security Policy

## Versioni supportate

Taxa Desk e' in fase beta. Le correzioni di sicurezza vengono applicate alla versione piu' recente pubblicata su GitHub Releases.

## Segnalare una vulnerabilita'

Per vulnerabilita' che possono esporre dati locali, alterare backup o compromettere il processo di aggiornamento, evita di pubblicare dettagli tecnici in una issue pubblica.

Usa uno di questi canali:

- apri una issue con descrizione generale e senza payload sensibili;
- contatta privatamente il maintainer attraverso i contatti del profilo GitHub.

Includi, se possibile:

- versione di Taxa Desk;
- versione di Windows;
- passaggi minimi per riprodurre;
- impatto atteso;
- eventuali file di log depurati da dati personali.

## Ambito

Sono considerate rilevanti:

- lettura o invio non autorizzato di dati locali;
- corruzione del database SQLite;
- perdita o sovrascrittura impropria dei backup;
- vulnerabilita' nel flusso di aggiornamento;
- esecuzione di codice non previsto;
- esposizione di chiavi private di firma.

## Fuori ambito

Non rientrano normalmente nell'ambito security:

- errori di stima fiscale;
- richieste di nuove funzioni;
- problemi grafici senza impatto sui dati;
- installazioni modificate manualmente dall'utente.

## Chiavi e release

La chiave privata Tauri updater non deve essere committata. Deve restare in un ambiente locale o CI sicuro e deve essere passata alla build tramite variabili d'ambiente.
