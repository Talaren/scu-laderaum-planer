# SCU-Laderaum-Planer

Kleine lokale Web-App für Star Citizen Liefermissionen. Du wählst ein Schiff, trägst Pickup und Aufträge ein und bekommst einen konkreten Ladeplan pro Ladeflug, inklusive Kisten pro Frachttyp und Ziel.

Die UI ist zweisprachig ausgelegt: Standard ist `en`, `de` ist direkt integriert. Die Übersetzungen liegen separat unter `translations/`, damit weitere Helfer sie leicht erweitern oder korrigieren können.

Release-Builds blenden unten in der App ausserdem Build-Metadaten ein: Versionsnummer und GitHub-Repository.

Für eine öffentliche Server-Veröffentlichung liegen Beispielkonfigurationen unter `deploy/`, inklusive Sicherheits-Header für `nginx` und `Caddy`.

Für Traefik gibt es zusätzlich ein fertiges Unterpfad-Deployment unter `deploy/traefik/`, das die neueste GitHub-Release-Version lokal herunterlädt und dann statisch ausliefert.

## Was die App berechnet

- Gruppierung mehrerer Aufträge in möglichst wenige Ladeflüge
- Verteilung einzelner Großaufträge über viele Flüge
- Anzahl der benötigten Flüge
- Kistenmix pro Flug
- Kisten je Ladung und Ziel pro Flug
- Berücksichtigung bereits abgeschlossener Teilmengen
- gemischte Frachtsorten innerhalb derselben Auftragsserie

Dadurch kannst du beispielsweise Missionen wie `48 + 32 + 32 + 176 SCU Quartz` mit einer `Argo RAFT` und nur `16/8/4/2/1`-Kisten so planen, dass drei kleine Ziele zusammen in einen Flug passen, während der große Auftrag einen eigenen Vollflug braucht.

Genauso funktioniert jetzt auch ein einzelner Großauftrag wie `1723 SCU Processed Food` von `Baijini-Point` nach `Everus Harbor`, der automatisch über mehrere Ladeflüge verteilt wird.

## Projekt starten

```bash
cd /home/rainerw/git/scu-laderaum-planer
python3 -m http.server 4173
```

Danach im Browser `http://localhost:4173` öffnen.

Direktstart ohne Webserver ist ebenfalls möglich: `index.html` kann jetzt auch direkt per Doppelklick oder via `file:///.../index.html` geöffnet werden.

## Tests

```bash
cd /home/rainerw/git/scu-laderaum-planer
npm test
```

## Release-Archiv bauen

Für GitHub-Releases gibt es einen Standalone-Build, der alles für den Direktstart per `index.html` in ein Archiv packt.

Lokal:

```bash
cd /home/rainerw/git/scu-laderaum-planer
npm run build:release -- v0.1.2
```

Danach liegen unter `dist/` eine `.zip`, eine `.tar.gz` und `SHA256SUMS.txt`.

Auf GitHub:

- Beim Veröffentlichen eines Releases baut `.github/workflows/release-standalone.yml` automatisch das Standalone-Archiv.
- Die Release-Assets enthalten `index.html`, `app-standalone.js`, `build-info.js`, `styles.css`, `translations/`, `README.md` und eine kurze Startdatei.
- `build-info.js` wird im Release automatisch mit Tag und GitHub-Repository gefüllt. Für lokale Builds kannst du optional `REPOSITORY_URL` und `REPOSITORY_LABEL` setzen.

## Sicher veröffentlichen

Wenn du die App auf einem öffentlichen Server hostest, nutze die Header aus einer der Beispielkonfigurationen:

- [nginx.conf](/home/rainerw/git/scu-laderaum-planer/deploy/nginx.conf)
- [Caddyfile](/home/rainerw/git/scu-laderaum-planer/deploy/Caddyfile)

Wichtige Punkte:

- `Content-Security-Policy` sperrt Fremdskripte und Inline-Objekte.
- `Referrer-Policy` reduziert ausgehende Metadaten.
- `X-Content-Type-Options` und `X-Frame-Options` härten den Browser gegen MIME-Sniffing und Framing.
- Die App selbst bleibt weiterhin direkt per `file://` startbar; deshalb liegen die harten Header bewusst in den Server-Configs und nicht nur als HTML-Meta-Regeln vor.

## Traefik auf wocher.eu

Wenn du die App unter `https://sc.wocher.eu/scu-planer/` veröffentlichen willst, liegt das passende Setup hier:

- [deploy/traefik/README.md](/home/rainerw/git/scu-laderaum-planer/deploy/traefik/README.md)
- [deploy/traefik/docker-compose.yml](/home/rainerw/git/scu-laderaum-planer/deploy/traefik/docker-compose.yml)
- [deploy/traefik/update-release.sh](/home/rainerw/git/scu-laderaum-planer/deploy/traefik/update-release.sh)

Das Setup ist für `https://sc.wocher.eu/scu-planer/` vorbereitet und kann per Timer regelmäßig auf die neueste GitHub-Release-Version aktualisieren.

## Nutzung

1. Schiff wählen.
   Mit der Schiffs-Suche findest du große Listen schneller.
2. Gemeinsamen Pickup und optional eine Standard-Ladung eintragen.
3. Pro Auftrag Ladung, Ziel, Gesamt-SCU und optional bereits gelieferte Menge erfassen.
4. Falls der Frachtaufzug limitiert ist, `Max. Kistengröße im Aufzug` setzen.
   Die App verwendet dann automatisch alle Boxen bis zu dieser Größe. Ist die Aufzugkiste größer als der größte Schiffsslot, ist der Auftrag blockiert.
5. `Pickup leeren` setzt Pickup und Standard-Ladung zurück. `Ziele leeren` setzt die Auftragsliste auf eine leere Zeile zurück.
6. Nach einem geflogenen Run im passenden Ladeflug auf `Geliefert eintragen` klicken, damit die Restmengen automatisch aktualisiert werden.
7. Mit `Link kopieren` erzeugst du eine URL, die den kompletten aktuellen Planungszustand enthaelt.
8. Über die Sprachwahl kannst du jederzeit zwischen `English` und `Deutsch` wechseln. Die Sprache wird lokal gespeichert und auch in Share-Links mitgegeben.

## Hinweise zu Schiffen und Beispielen

Die App nutzt feste SCU-Slots pro Schiff. Für die RAFT gibt es genau einen Eintrag:

- `Argo RAFT` mit sechs festen `32-SCU`-Slots

Zusätzlich ist die Schiffsliste jetzt breit mit PDF-basierten Grid-Slots hinterlegt, unter anderem für RSI, Drake, Crusader, Aegis, Anvil, MISC, Origin und Argo. Korrigierte Sonderfälle wie `Origin 600i Explorer` und `Esperia Prowler Utility` sind bereits eingepflegt.

In der UI sind jetzt fünf Beispiel-Szenarien auswählbar:

- `Großauftrag`
- `Gleiche Fracht, mehrere Ziele`
- `Gemischte Fracht mit geteiltem Ziel`
- `RAFT: 3 kleine Ziele + 1 Vollflug`
- `Zu kleines Schiff für Aufzugkiste`

## Veröffentlichung

Das Repository ist für ein öffentliches GitHub-Release vorbereitet und steht unter `GPL-3.0-only`, siehe [LICENSE](/home/rainerw/git/scu-laderaum-planer/LICENSE).
