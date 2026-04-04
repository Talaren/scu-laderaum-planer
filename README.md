# SCU-Laderaum-Planer

Kleine lokale Web-App fuer Star Citizen Liefermissionen. Du waehlst ein Schiff, trägst die Route ein, setzt die Missionsmenge in SCU und aktivierst nur die Kistengroessen, die fuer die Mission wirklich verfuegbar sind. Danach bekommst du einen konkreten Ladeplan pro Flug.

## Was die App berechnet

- exakte Lieferung oder minimale Ueberlieferung
- Anzahl der benoetigten Fluege
- Kistenmix pro Flug
- Slot-Belegung pro Flug

Der wichtige Punkt ist das Schiffsmodell:

- flexible Frachtraeume werden als ein oder mehrere Slots mit freier Kistenkombination behandelt
- feste Containerhalterungen wie bei der RAFT lassen sich ueber `Max. Kisten pro Slot = 1` realistisch einschraenken

Dadurch kannst du beispielsweise unterscheiden, ob `93 SCU` mit einem Schiff exakt in einem Flug moeglich sind oder ob du einen Restflug brauchst.

## Projekt starten

```bash
cd /home/rainerw/git/scu-laderaum-planer
python3 -m http.server 4173
```

Danach im Browser `http://localhost:4173` oeffnen.

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
5. Zwischen `Genau liefern` und `Mindestens liefern` waehlen.

## Hinweise zu den Vorlagen

Star Citizen aendert Cargo-Kapazitaeten und Verhalten je nach Patch. Die Vorlagen im Projekt sind deshalb absichtlich editierbar. Fuer die RAFT sind zwei Startpunkte hinterlegt:

- `ARGO RAFT (3x32)` fuer die klassische Interpretation mit drei festen Containern
- `ARGO RAFT (6x32)` als alternative Vorlage, falls du mit einer erweiterten Kapazitaet planst

Wenn dein Schiff oder dein aktueller Patch abweicht, passt du die Werte direkt im Formular an.
