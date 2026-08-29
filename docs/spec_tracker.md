# Triathlon-Tracker

**Stand:** 28. August 2026

**Route:** `/apps/triathlon-tracker`
**Status:** Live

## Ziel

Der Triathlon-Tracker ist eine reguläre App der BengtsToolBox. Er hält geplante und absolvierte Einheiten für Schwimmen, Radfahren und Laufen fest, zeigt Wochenvolumen und schätzt die aktuelle Leistungsfähigkeit aus vergleichbaren Trainingsdaten.

Die App dokumentiert und visualisiert. Sie erstellt keine Trainingspläne, gibt keine Coaching- oder Gesundheitsempfehlungen und bewertet keine Planerfüllung.

## Betriebsmodell

- Ein Tracker-Datensatz gehört zum aktuellen globalen beziehungsweise Lobby-Datenraum.
- Alle anonym angemeldeten Geräte einer Lobby dürfen denselben Datensatz bearbeiten.
- Die App verwendet die vorhandenen Firestore-Hooks, Firebase-Authentifizierung und den vorhandenen LocalStorage-Fallback.
- Zeitzone ist `Europe/Berlin`, die Woche beginnt montags und alle Einheiten werden metrisch angezeigt.
- Es gibt weder persönliche Konten noch Rollen oder Berechtigungen innerhalb einer Lobby.

## Umfang

### Leistungsoptionen

- Optionales aktuelles Gewicht in Kilogramm wird direkt neben den Kontextfiltern der Leistungsentwicklung gepflegt und für die Anzeige von Radleistung in W/kg verwendet.
- Schwimmen wird dort nach 25-m-Becken, 50-m-Becken oder Freiwasser, Radfahren nach Indoor oder Outdoor und Laufen nach Straße, Bahn oder Laufband getrennt betrachtet. Vorausgewählt sind 50-m-Becken, Outdoor und Straße; neue absolvierte Einheiten übernehmen den jeweils aktiven Kontext als Eingabestandard. Beim Bearbeiten eines älteren Eintrags ohne Kontext wird dieser Standard ebenfalls vorausgewählt und erst mit dem Speichern übernommen.
- Es gibt keinen separaten Einstellungsdialog.
- Keine Gewichtshistorie und keine weiteren Körper- oder Wearable-Messwerte.

### Geplante Einheiten

Eine geplante Einheit enthält:

- Datum und optionale Startzeit,
- Disziplin `swim`, `bike` oder `run`,
- optionale Dauer und Distanz,
- optionales kurzes Label mit höchstens 40 Zeichen.

Geplante Einheiten sind reine Kalendereinträge. Sie haben keinen Erledigt-, Teilweise- oder Ausgelassen-Status und werden nicht mit absolvierten Einheiten verknüpft. Eine Woche kann nach Vorschau auf eine andere Woche kopiert werden; dabei sind bewusst auch Duplikate erlaubt.

### Absolvierte Einheiten

Eine absolvierte Einheit benötigt Datum, Disziplin und mindestens Dauer oder Distanz. Optional erfassbar sind:

- Startzeit,
- Durchschnittspace im Format `mm:ss`; beim Schwimmen gilt sie pro 100 Meter, beim Radfahren und Laufen pro Kilometer,
- durchschnittliche Herzfrequenz,
- durchschnittliche Leistung,
- RPE von 1 bis 10,
- disziplinspezifischer Kontext:
  - Schwimmen: 25-m-Becken, 50-m-Becken oder Freiwasser,
  - Radfahren: Indoor oder Outdoor,
  - Laufen: Straße, Bahn oder Laufband,
- strukturierte Intervalle mit Belastungs- und Pausenabschnitten; je Abschnitt optional Dauer, Distanz, Durchschnittspuls und Durchschnittsleistung.

Intervalle werden ausschließlich über Eingabefelder aufgebaut. Es gibt keinen Textparser. Einheiten lassen sich nachträglich bearbeiten und löschen.

Sobald eine positive Distanz vorliegt, bedingen sich Dauer und Durchschnittspace gegenseitig: Eine Eingabe oder Änderung in einem der beiden Felder berechnet das andere. Gespeichert werden weiterhin Dauer und Distanz; die Pace bleibt ein daraus abgeleiteter Wert.

### Kalender und Verlauf

- Monats- und Wochenansicht mit Montag als erstem Wochentag.
- Mehrere geplante und absolvierte Einheiten pro Tag.
- Desktop-Monatsansicht als gleichmäßig unterteiltes Sieben-Spalten-Grid mit gleich hohen Tagen und internem Scrollen bei mehr als drei Einträgen.
- Die aktuelle Kalenderwoche ist in der Desktop-Monatsansicht über alle sieben Tage zusammenhängend dezent umrandet.
- Auf Tablet und Mobilgeräten zeigt die Monatsansicht ein kompaktes Datumsgitter mit einer Tagesagenda für das gewählte Datum; die Wochenansicht erscheint als kurze vertikale Tagesagenda.
- Neue Planungen entstehen über eine gestrichelte Karte in der Größe eines Trainingseintrags im jeweiligen Tag.
- Plan und Ist unterscheiden sich nicht nur durch Farbe, sondern zusätzlich durch Füllung, Rand, Icon und Textlabel.
- Die Disziplinfarben für Schwimmen, Radfahren und Laufen bleiben in Kalender, Kennzahlen, Leistungsdarstellung, Diagrammen und Trainingsliste konsistent.
- Keine Filter und kein Drag-and-drop.
- Kompakte Liste der letzten absolvierten Einheiten mit Bearbeiten und Löschen.

### Wochenstatistik

Für die aktuelle Woche zeigt die App:

- gesamte Trainingszeit,
- Zeit, Distanz und Anzahl je Disziplin.

Die vier gleich breiten Kennzahlen für Woche, Schwimmen, Radfahren und Laufen verwenden disziplinspezifische Farben aus dem Toolbox-Farbraum. Ein Verlauf visualisiert standardmäßig die Wochendistanz und umschaltbar die Wochenzeit je Disziplin; `Distanz pro Woche` steht dabei links von `Zeit pro Woche`. Dieses Wochenvolumen besitzt keine zusätzliche Tabellenansicht. Auf Bildschirmbreiten unter 1280 Pixeln wird je Zeitpunkt nur das Leistungsdiagramm einer Disziplin angezeigt. Eine Planerfüllungsquote oder Belastungsmetrik wird nicht berechnet.

## Leistungsmodelle

### Gemeinsame Regeln

- Die aktuelle Hochrechnung verwendet höchstens die letzten zwölf Monate.
- Modelle verwenden automatisch die stärksten vergleichbaren kontinuierlichen Einheiten als obere Leistungshülle.
- Strukturierte Intervalleinheiten erscheinen in den Trainingsdaten, werden aber nie als Leistungsanker verwendet.
- Für ein individuell angepasstes Modell sind mindestens drei geeignete Einheiten in ausreichend unterschiedlichen Dauer- beziehungsweise Distanzbereichen nötig. Ohne eine disziplinspezifische Ersatzregel zeigt die Oberfläche `Noch nicht genug Daten.` sowie die Zahl der vorhandenen und benötigten geeigneten Trainings.
- Mehrere Einheiten über exakt dieselbe Distanz bilden höchstens einen Leistungsanker; verwendet wird die stärkste davon. Weitere passende Einheiten bleiben als Bestätigung der Datenbasis gezählt.
- Kontexte werden nicht vermischt: Beckenlängen und Freiwasser, Indoor und Outdoor sowie Straße, Bahn und Laufband werden jeweils getrennt modelliert.
- Ältere Einträge ohne Kontext werden für die Auswertung dem jeweiligen Standardkontext 50-m-Becken, Outdoor beziehungsweise Straße zugeordnet.
- Historische Kurvenpunkte verwenden nur Daten, die am jeweiligen Stichtag bereits vorhanden waren.
- Modellierte Punkte und Linien nutzen das wissenschaftliche Modell statt einer Fortschreibung mit konstanter Pace.

### Laufen

- Zielzeiten: 5 km und 10 km.
- Bei mindestens drei ausreichend unterschiedlichen Ankern sind ein Critical-Speed-Modell und ein individuell angepasstes Potenzgesetz die Kandidaten; gewählt wird das gültige Modell mit dem kleineren Leave-one-out-Fehler.
- Fehlt diese Streuung, reicht ein kontinuierlicher Lauf über mindestens 5 km für eine Hochrechnung mit dem festen Riegel-Exponent 1,06. Unter mehreren passenden Läufen liefert die stärkste auf 5 km normierte Leistung den Modellanker; alle passenden Läufe werden als bestätigende Datenbasis ausgewiesen.
- Die durchschnittliche Herzfrequenz bleibt als Trainingskontext erhalten, korrigiert die Hochrechnung aber nicht. Ohne Maximalpuls oder individuelle Zonen lässt sich aus einem niedrigeren oder höheren Durchschnittspuls keine belastbare Wettkampfleistung ableiten.

### Schwimmen

- Zielzeiten: 750 m und 1.500 m.
- Bevorzugt wird Critical Swim Speed aus passenden starken 200-m- und 400-m-Leistungen mit mindestens einer weiteren Stützeinheit.
- Falls CSS nicht anwendbar ist, wird bei mindestens drei unterschiedlichen Distanzen ein individuelles Potenzgesetz verwendet.

### Radfahren

- Bei mindestens drei geeigneten Leistungs-Dauer-Ankern wird Critical Power mit W′ berechnet.
- Angezeigt wird Critical Power in Watt und, falls Gewicht gesetzt ist, in W/kg. Critical Power wird nicht in eine Distanzzeit umgerechnet.
- Ohne ausreichende Leistungsdaten werden 20-km- und 40-km-Zeiten aus vergleichbaren Distanz-Zeit-Ankern per Potenzgesetz geschätzt; die 20-km-Zeit ist die Hauptkennzahl.

### Fortschrittsanzeige

- Jede geeignete kontinuierliche Einheit bleibt als Punkt sichtbar.
- Disziplinindizes starten in der ersten berechenbaren Woche bei 100.
- Ein Gesamtindex wird als gleich gewichtetes geometrisches Mittel gebildet, jedoch nur wenn für alle drei Disziplinen ein Index vorliegt.
- Konkrete geschätzte Zeiten beziehungsweise Radleistung werden zusätzlich dargestellt.
- Hauptdiagramme besitzen die Bereiche 4 Wochen, 12 Wochen, 6 Monate, 1 Jahr und Gesamt. Die Leistungs- und Fortschrittsdiagramme bieten zusätzlich eine zugängliche tabellarische Textalternative.

## Seitenaufbau

Die einzelne Tracker-Seite verwendet vorhandene Toolbox-Komponenten und ordnet die Inhalte so an:

1. kompakte Zusammenfassung dieser Woche und der drei Disziplinen,
2. Hauptaktion `Training eintragen`,
3. aktuelle Hochrechnungen in der Reihenfolge Schwimmen, Radfahren und Laufen mit Kontextfiltern und Gewicht; die Karten wiederholen den aktiven Kontext nicht,
4. Monats- beziehungsweise Wochenkalender mit tageweiser Planaktion,
5. Leistungs- und Wochenvolumendiagramme,
6. letzte absolvierte Einheiten als mobile Liste beziehungsweise Desktop-Tabelle.

Formulare öffnen in vorhandenen Dialogen. Die Trainingseingabe zeigt zuerst Datum, Disziplin, Kontext, Dauer, Distanz, Pace und durchschnittliche Herzfrequenz. Leistung, RPE und Intervalle liegen im aufklappbaren Bereich `Weitere Angaben`. Die Seite funktioniert kompakt auf Desktop, Tablet und Mobilgeräten, unterstützt Tastatur und Dark Mode und erzeugt keine horizontale Seiten-Scrollleiste.

## Technische Einordnung

- Registry-ID: `triathlon-tracker`.
- Feature-Code: `src/apps/triathlon-tracker/`.
- UI liegt in der Page und feature-lokalen Komponenten.
- Synchronisierter Zustand und Aktionen liegen im Feature-Hook.
- Fachmodelle und Hochrechnungen sind pure, getestete TypeScript-Module.
- Das optionale Gewicht liegt in einem Firestore-Dokument; Planungen und absolvierte Einheiten liegen in getrennten Collections unter dem kanonischen globalen beziehungsweise Lobby-Pfad.
- Berechnete Hochrechnungen werden nicht gespeichert, sondern im Client aus den Rohdaten abgeleitet.
- Diagramme werden lazy geladen; die übrige App verwendet die vorhandenen UI-Komponenten, Tokens und Icons.

## Bewusst nicht enthalten

- Datei-, Wearable-, Strava- oder sonstige Importe,
- wiederkehrende Termine und Duplizieren einzelner Einheiten,
- Plan-Ist-Verknüpfung oder Planerfüllung,
- Krafttraining, Mobility oder weitere Disziplinen,
- VO₂max, Ruhepuls, HRV, Pulszonen, Höhenmeter, Routen und Maximalwerte,
- Belastungsmodelle wie sRPE, TRIMP oder EWMA,
- Coaching, Trainingsvorschläge, soziale Funktionen und Live-Tracking,
- Multisport-/Brick-Gruppen und Wettkampfwechsel,
- globale Lösch- oder Reset-Aktion,
- Datenimport und Datenexport.

## Abnahmekriterien

- Die App erscheint genau einmal im Dashboard und ist global sowie innerhalb einer Lobby erreichbar.
- Planungen, Trainings und Gewicht synchronisieren über die bestehenden Datenhooks und funktionieren im lokalen Fallback.
- Alle beschriebenen Eingabe-, Berechnungs-, Bearbeitungs-, Lösch- und Wochenkopieabläufe funktionieren ohne Import- oder Exportoption.
- Unzureichende oder nicht vergleichbare Daten erzeugen keine scheinpräzise Hochrechnung.
- Fachlogik ist durch Unit-Tests, Firestore-Pfade und Regeln durch fokussierte Tests sowie die Oberfläche durch gerenderte Desktop- und Mobile-Prüfungen abgesichert.
