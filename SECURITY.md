# Security Policy

## Versioni supportate

Taxa Desk è in fase beta. Le correzioni di sicurezza vengono applicate alla versione più recente pubblicata su GitHub Releases.

## Segnalare una vulnerabilità

Per vulnerabilità che possono esporre dati locali, alterare backup o compromettere il processo di aggiornamento, non pubblicare dettagli tecnici in una issue pubblica.

Canale consigliato:

- usa la pagina GitHub Security del repository, se disponibile: [Security Advisories](https://github.com/Heylucasabatino/taxa-desk/security/advisories);
- in alternativa contatta privatamente il maintainer attraverso i contatti del profilo GitHub.

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
- vulnerabilità nel flusso di aggiornamento;
- esecuzione di codice non previsto;
- esposizione di chiavi private di firma.

## Fuori ambito

Non rientrano normalmente nell’ambito security:

- errori di stima fiscale;
- richieste di nuove funzioni;
- problemi grafici senza impatto sui dati;
- installazioni modificate manualmente dall’utente.

## Chiavi e release

La chiave privata Tauri updater non deve essere committata. Deve restare in un ambiente locale o CI sicuro e deve essere passata alla build tramite variabili d’ambiente.
