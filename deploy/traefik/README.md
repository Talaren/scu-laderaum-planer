# Traefik Deployment

Dieses Setup ist fuer eine Veröffentlichung unter einer Unterseite von `sc.wocher.eu` gedacht, konkret zum Beispiel:

- `https://sc.wocher.eu/scu-planer/`

Der Ablauf ist bewusst zweistufig:

1. `update-release.sh` prueft die neueste GitHub-Release-Version, laedt das Standalone-Archiv lokal herunter und entpackt es nach `deploy/traefik/runtime/current/`.
2. `docker-compose.yml` startet einen kleinen `nginx`-Container hinter Traefik, der genau diesen lokalen Stand ausliefert.

## Vorbereitung

```bash
cd /home/rainerw/git/scu-laderaum-planer/deploy/traefik
cp .env.example .env
```

Danach in `.env` mindestens setzen:

- `APP_HOST=sc.wocher.eu`
- `APP_PATH_PREFIX=/scu-planer`
- `GITHUB_REPOSITORY=Talaren/scu-laderaum-planer`
- `TRAEFIK_NETWORK=<dein-traefik-docker-netzwerk>`

## Erstes Deployment

```bash
cd /home/rainerw/git/scu-laderaum-planer/deploy/traefik
./deploy-latest.sh
```

Das Skript:

- laedt die neueste Release-Version von GitHub
- entpackt sie lokal nach `runtime/current/`
- startet oder aktualisiert danach den Web-Container

## Automatische Updates

Wenn dein Server `systemd` nutzt, kannst du die Timer-Dateien unter `systemd/` verwenden.

Beispiel:

```bash
sudo cp systemd/scu-laderaum-planer-update.service /etc/systemd/system/
sudo cp systemd/scu-laderaum-planer-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now scu-laderaum-planer-update.timer
```

Der Timer ruft regelmaessig nur `update-release.sh` auf. Der laufende `nginx`-Container bedient danach automatisch den aktualisierten lokalen Stand aus `runtime/current/`.

## Wichtige Hinweise

- Die Traefik-Regeln behandeln sowohl `${APP_PATH_PREFIX}` als auch `${APP_PATH_PREFIX}/`. Der genaue Pfad ohne Slash wird auf die Slash-Variante umgeleitet.
- Das interne `nginx` setzt die Sicherheits-Header fuer CSP, Referrer, MIME-Sniffing und Framing.
- Fuer oeffentliche Repos reicht unauthentischer GitHub-API-Zugriff meist aus. Wenn du Rate-Limits vermeiden willst, setze `GITHUB_TOKEN` in `.env`.
