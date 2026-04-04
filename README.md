# SCU-Laderaum-Planer

Kleine lokale Web-App fuer Star Citizen Liefermissionen. Du waehlst ein Schiff, trägst Pickup und Auftraege ein und bekommst einen konkreten Ladeplan pro Ladeflug, inklusive Kisten pro Frachttyp und Ziel.

## Was die App berechnet

- Gruppierung mehrerer Auftraege in moeglichst wenige Ladefluege
- Verteilung einzelner Grossauftraege ueber viele Fluege
- Anzahl der benoetigten Fluege
- Kistenmix pro Flug
- Kisten je Ladung und Ziel pro Flug
- Beruecksichtigung bereits abgeschlossener Teilmengen
- gemischte Frachtsorten innerhalb derselben Auftragsserie

Dadurch kannst du beispielsweise Missionen wie `48 + 32 + 32 + 176 SCU Quartz` mit einer `Argo RAFT` und nur `16/8/4/2/1`-Kisten so planen, dass drei kleine Ziele zusammen in einen Flug passen, waehrend der grosse Auftrag einen eigenen Vollflug braucht.

Genauso funktioniert jetzt auch ein einzelner Grossauftrag wie `1723 SCU Processed Food` von `Baijini-Point` nach `Everus Harbor`, der automatisch ueber mehrere Ladefluege verteilt wird.

## Projekt starten

```bash
cd /home/rainerw/git/scu-laderaum-planer
python3 -m http.server 4173
```

Danach im Browser `http://localhost:4173` oeffnen.

Direktstart ohne Webserver ist ebenfalls moeglich: `index.html` kann jetzt auch direkt per Doppelklick oder via `file:///.../index.html` geoeffnet werden.

## Tests

```bash
cd /home/rainerw/git/scu-laderaum-planer
npm test
```

## Release-Archiv bauen

Fuer GitHub-Releases gibt es einen Standalone-Build, der alles fuer den Direktstart per `index.html` in ein Archiv packt.

Lokal:

```bash
cd /home/rainerw/git/scu-laderaum-planer
npm run build:release -- v0.1.0
```

Danach liegen unter `dist/` eine `.zip`, eine `.tar.gz` und `SHA256SUMS.txt`.

Auf GitHub:

- Beim Veröffentlichen eines Releases baut `.github/workflows/release-standalone.yml` automatisch das Standalone-Archiv.
- Die Release-Assets enthalten `index.html`, `app-standalone.js`, `styles.css`, `README.md` und eine kurze Startdatei.

## Nutzung

1. Schiff waehlen.
   Mit der Schiffs-Suche findest du grosse Listen schneller.
2. Gemeinsamen Pickup und optional eine Standard-Ladung eintragen.
3. Pro Auftrag Ladung, Ziel, Gesamt-SCU und optional bereits gelieferte Menge erfassen.
4. Falls der Frachtaufzug limitiert ist, `Max. Kistengroesse im Aufzug` setzen.
   Die App verwendet dann automatisch alle Boxen bis zu dieser Groesse. Ist die Aufzugkiste groesser als der groesste Schiffsslot, ist der Auftrag blockiert.
5. `Pickup leeren` setzt Pickup und Standard-Ladung zurueck. `Ziele leeren` setzt die Auftragsliste auf eine leere Zeile zurueck.
6. Nach einem geflogenen Run im passenden Ladeflug auf `Geliefert eintragen` klicken, damit die Restmengen automatisch aktualisiert werden.
7. Mit `Link kopieren` erzeugst du eine URL, die den kompletten aktuellen Planungszustand enthaelt.

## Hinweise zu Schiffen und Beispielen

Die App nutzt feste SCU-Slots pro Schiff. Fuer die RAFT gibt es genau einen Eintrag:

- `Argo RAFT` mit sechs festen `32-SCU`-Slots

Zusaetzlich ist die Schiffsliste jetzt breit mit PDF-basierten Grid-Slots hinterlegt, unter anderem fuer RSI, Drake, Crusader, Aegis, Anvil, MISC, Origin und Argo. Korrigierte Sonderfaelle wie `Origin 600i Explorer` und `Esperia Prowler Utility` sind bereits eingepflegt.

In der UI sind jetzt fuenf Beispiel-Szenarien auswaehlbar:

- `Grossauftrag`
- `Gleiche Fracht, mehrere Ziele`
- `Gemischte Fracht mit geteiltem Ziel`
- `RAFT: 3 kleine Ziele + 1 Vollflug`
- `Zu kleines Schiff fuer Aufzugkiste`

## Veröffentlichung

Das Repository ist fuer ein öffentliches GitHub-Release vorbereitet und steht unter `GPL-3.0-only`, siehe [LICENSE](/home/rainerw/git/scu-laderaum-planer/LICENSE).
