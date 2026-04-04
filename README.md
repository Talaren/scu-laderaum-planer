# SCU-Laderaum-Planer

Kleine lokale Web-App fuer Star Citizen Liefermissionen. Du waehlst ein Schiff, trägst den gemeinsamen Pickup ein, legst mehrere Auftraege mit Ziel und SCU an und aktivierst nur die Kistengroessen, die fuer die Mission wirklich verfuegbar sind. Danach bekommst du einen konkreten Ladeplan pro Ladeflug.

## Was die App berechnet

- Gruppierung mehrerer Auftraege in moeglichst wenige Ladefluege
- Anzahl der benoetigten Fluege
- Kistenmix pro Flug
- Slot-Belegung pro Flug
- Beruecksichtigung bereits abgeschlossener Teilmengen

Der wichtige Punkt ist das Schiffsmodell:

- flexible Frachtraeume werden als ein oder mehrere Slots mit freier Kistenkombination behandelt
- feste Containerhalterungen wie bei der RAFT lassen sich ueber `Max. Kisten pro Slot = 1` realistisch einschraenken

Dadurch kannst du beispielsweise Missionen wie `124 + 93 + 84 SCU Quartz` mit einer `RAFT 6x32` und nur `16/8/4/2/1`-Kisten so planen, dass `93 + 84` zusammen in einen Ladeflug gehen und `124` in den zweiten.

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
3. Quelle, Ziel und Missionsmenge eintragen.
4. Verfuegbare Kistengroessen aktivieren.
5. Bereits gelieferte Mengen bei Bedarf eintragen.
6. Optional `Nur bis 16 SCU` klicken, wenn der Missionsaufzug keine groesseren Kisten ausgibt.

## Hinweise zu den Vorlagen

Star Citizen aendert Cargo-Kapazitaeten und Verhalten je nach Patch. Die Vorlagen im Projekt sind deshalb absichtlich editierbar. Fuer die RAFT sind mehrere Startpunkte hinterlegt:

- `ARGO RAFT (6x32 Missionscargo)` fuer Missionen mit mehreren 32-SCU-Slots und kleineren Aufzugskisten
- `ARGO RAFT (3x32)` fuer die klassische Interpretation mit drei festen Containern
- `ARGO RAFT (6x32)` als alternative Vorlage, falls du mit einer erweiterten Kapazitaet planst

Wenn dein Schiff oder dein aktueller Patch abweicht, passt du die Werte direkt im Formular an.
