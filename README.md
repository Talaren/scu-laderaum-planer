# SCU-Laderaum-Planer

Kleine lokale Web-App fuer Star Citizen Liefermissionen. Du waehlst ein Schiff, trägst den gemeinsamen Pickup ein, legst mehrere Auftraege mit eigener Frachtsorte, Ziel und SCU an und aktivierst nur die Kistengroessen, die fuer die Mission wirklich verfuegbar sind. Danach bekommst du einen konkreten Ladeplan pro Ladeflug.

## Was die App berechnet

- Gruppierung mehrerer Auftraege in moeglichst wenige Ladefluege
- Verteilung einzelner Grossauftraege ueber viele Fluege
- Anzahl der benoetigten Fluege
- Kistenmix pro Flug
- Slot-Belegung pro Flug
- Beruecksichtigung bereits abgeschlossener Teilmengen
- gemischte Frachtsorten innerhalb derselben Auftragsserie

Der wichtige Punkt ist das Schiffsmodell:

- flexible Frachtraeume werden als ein oder mehrere Slots mit freier Kistenkombination behandelt
- feste Containerhalterungen wie bei der RAFT lassen sich ueber `Max. Kisten pro Slot = 1` realistisch einschraenken

Dadurch kannst du beispielsweise Missionen wie `124 + 93 + 84 SCU Quartz` mit einer `RAFT 6x32` und nur `16/8/4/2/1`-Kisten so planen, dass `93 + 84` zusammen in einen Ladeflug gehen und `124` in den zweiten.

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

## Nutzung

1. Schiffsvorlage waehlen.
2. Falls noetig `Slot-Kapazitaeten` oder `Max. Kisten pro Slot` an deinen Patch anpassen.
3. Gemeinsamen Pickup und optional eine Standard-Ladung eintragen.
4. Pro Auftrag Ladung, Ziel, Gesamt-SCU und optional bereits gelieferte Menge erfassen.
5. Verfuegbare Kistengroessen aktivieren.
6. Optional `Nur bis 16 SCU` klicken, wenn der Missionsaufzug keine groesseren Kisten ausgibt.
7. Nach einem geflogenen Run im passenden Ladeflug auf `Geliefert eintragen` klicken, damit die Restmengen automatisch aktualisiert werden.

## Hinweise zu den Vorlagen

Star Citizen aendert Cargo-Kapazitaeten und Verhalten je nach Patch. Die Vorlagen im Projekt sind deshalb absichtlich editierbar. Fuer die RAFT sind mehrere Startpunkte hinterlegt:

- `ARGO RAFT (6x32 Missionscargo)` fuer Missionen mit mehreren 32-SCU-Slots und kleineren Aufzugskisten
- `ARGO RAFT (3x32)` fuer die klassische Interpretation mit drei festen Containern
- `ARGO RAFT (6x32)` als alternative Vorlage, falls du mit einer erweiterten Kapazitaet planst

Fuer schnelle Tests gibt es in der UI jetzt zwei Beispielsets: Quartz-Missionen und eine gemischte Route mit `Hydrogen Fuel`, `Quantum Fuel` und `Ship Ammunition`.

Wenn dein Schiff oder dein aktueller Patch abweicht, passt du die Werte direkt im Formular an.
