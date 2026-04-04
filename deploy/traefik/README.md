# Traefik Deployment

Dieses Setup ist für eine Veröffentlichung unter einer Unterseite von `sc.wocher.eu` gedacht, konkret zum Beispiel:

- `https://sc.wocher.eu/scu-planer/`

Der Ablauf ist bewusst zweistufig:

1. `update-release.sh` prüft die neueste GitHub-Release-Version, lädt das Standalone-Archiv lokal herunter und entpackt es nach `deploy/traefik/runtime/current/`.
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
- `TRAEFIK_NETWORK=proxy`

Wichtig:

- `TRAEFIK_NETWORK` muss zum `--providers.docker.network` von Traefik passen.
- In deiner Konfiguration ist das `proxy`.
- Mit `docker network ls` findest du die vorhandenen Netzwerke.
- Wenn dein Traefik selbst mit `network_mode: host` läuft, ist das für dieses Setup in Ordnung. Entscheidend ist trotzdem das Docker-Netzwerk aus `--providers.docker.network`, also hier `proxy`.

## Erstes Deployment

```bash
cd /home/rainerw/git/scu-laderaum-planer/deploy/traefik
./deploy-latest.sh
```

Das Skript:

- lädt die neueste Release-Version von GitHub
- entpackt sie lokal nach `runtime/current/`
- startet oder aktualisiert danach den Web-Container

## Automatische Updates

Wenn dein Server `systemd` nutzt, kannst du die Timer-Dateien unter `systemd/` verwenden.

Beispiel:

```bash
sudo cp systemd/scu-laderaum-planer-update.env.example /etc/default/scu-laderaum-planer-update
sudo cp systemd/scu-laderaum-planer-update.service /etc/systemd/system/
sudo cp systemd/scu-laderaum-planer-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now scu-laderaum-planer-update.timer
```

Danach in `/etc/default/scu-laderaum-planer-update` den echten Deploy-Pfad setzen, zum Beispiel:

```bash
DEPLOY_DIR=/home/rainerw/scu-laderaum-planer/deploy/traefik
```

Der Timer ruft regelmäßig `deploy-latest.sh` auf. Damit werden neue Releases heruntergeladen und der Container zugleich sauber mit dem aktuellen Stand abgeglichen.

## Fehlerbehebung

Wenn `./deploy-latest.sh` mit `network ... declared as external, but could not be found` scheitert:

1. `docker network ls` ausführen
2. das Netzwerk suchen, das dein Traefik nutzt
3. `TRAEFIK_NETWORK` in `.env` auf genau diesen Namen setzen
4. `./deploy-latest.sh` erneut starten

Wenn `docker compose` eine Orphan-Warnung für den Traefik-Container zeigt:

- nicht `--remove-orphans` verwenden
- stattdessen die aktualisierte Compose-Datei aus diesem Repo holen
- die Datei setzt einen eigenen Projektnamen, damit dein `/opt/traefik`-Stack nicht mehr als fremdes Compose-Projekt erscheint

## Wichtige Hinweise

- Die Traefik-Regeln behandeln sowohl `${APP_PATH_PREFIX}` als auch `${APP_PATH_PREFIX}/`. Der genaue Pfad ohne Slash wird auf die Slash-Variante umgeleitet.
- Das interne `nginx` setzt die Sicherheits-Header für CSP, Referrer, MIME-Sniffing und Framing.
- Für öffentliche Repos reicht unauthentischer GitHub-API-Zugriff meist aus. Wenn du Rate-Limits vermeiden willst, setze `GITHUB_TOKEN` in `.env`.
