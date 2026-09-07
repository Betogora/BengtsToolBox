# Triathlon-Tracker

**Stand:** 6. September 2026

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

Je zwei positive Angaben aus Dauer, Distanz und Durchschnittspace berechnen die dritte Größe. Maßgeblich sind die beiden zuletzt manuell bearbeiteten Felder; unvollständige Eingaben leeren die daraus berechnete Größe. Gespeichert werden weiterhin Dauer und Distanz; die Pace bleibt ein daraus abgeleiteter Wert.

### Kalender, Tagebuch und Statistik

- Drei Tabs nach dem Navigationsmuster der Turnier-App trennen Trainingsplan, absolvierte Trainings und Statistik.
- Der Kalender zeigt ausschließlich geplante Einheiten; absolvierte Einheiten erscheinen dort nicht.
- Monats- und Wochenansicht beginnen montags. Desktop: sieben Tagesspalten mit mehreren Trainingskarten und einer zusätzlichen Wochensumme für Dauer und Anzahl sowie Dauer je Disziplin.
- Mobil und auf Tablets: kompaktes Monatsgitter mit ausgewählter Tagesagenda; die Wochenansicht zeigt sieben Tage untereinander.
- Der heutige Tag wird markiert. Navigation über Heute, Vor/Zurück und eine direkte Datumsauswahl.
- Tagesaktionen öffnen den Planeditor. Eine einzelne Einheit lässt sich als bearbeitbare Kopie übernehmen; ganze Wochen werden weiterhin nach Vorschau kopiert.
- Drag-and-drop verschiebt Planungen zwischen sichtbaren Tagen. Das Datumsfeld im Editor erlaubt dieselbe Änderung auf Touch-Geräten und per Tastatur.
- Das Tagebuch zeigt sämtliche absolvierten Einheiten in einer horizontal scrollbar zugänglichen Tabelle: Datum, Disziplin, Dauer, Distanz, Pace, Puls, Leistung, RPE, Kontext und Aktionen. Intervalleinheiten tragen eine Angabe zur Zahl ihrer Abschnitte.
- Filter für Disziplin und Datumsbereich, umkehrbare Datumssortierung und Seiten zu 20 Einträgen erschließen auch ältere Datensätze.
- Die Erfassungsmaske gruppiert Training, Messwerte und optionale Detailangaben einschließlich Intervallen. Nach dem Speichern öffnet sich das Tagebuch. Bearbeiten und Löschen bleiben möglich.
- Disziplinfarben bleiben über Kalender, Tagebuch und Statistik konsistent. Leistungsmodelle und bestehende Speicherpfade bleiben erhalten.

### Wochenstatistik

Für die aktuelle Woche zeigt die App:

- gesamte Trainingszeit,
- Zeit, Distanz und Anzahl je Disziplin.

Die vier gleich breiten Kennzahlen für Woche, Schwimmen, Radfahren und Laufen verwenden disziplinspezifische Farben aus dem Toolbox-Farbraum. Ein Verlauf visualisiert standardmäßig die Wochendistanz und umschaltbar die Wochenzeit je Disziplin; `Distanz pro Woche` steht dabei links von `Zeit pro Woche`. Dieses Wochenvolumen besitzt keine zusätzliche Tabellenansicht. Das Wochenvolumen und der Fortschrittsindex stehen auf großen Bildschirmen nebeneinander. Darunter wählt ein Disziplin-Tab ein breites Leistungsdiagramm. Zeitachsen bilden tatsächliche Datumsabstände ab; Laufen und Schwimmen zeigen Pace statt Geschwindigkeit. Eine Planerfüllungsquote oder Belastungsmetrik wird nicht berechnet.

## Leistungsmodelle

### Gemeinsame Regeln

- Die aktuelle Hochrechnung verwendet höchstens die letzten drei Monate.
- Als maximaler Leistungstest oder Wettkampf markierte Einheiten werden bevorzugt. Ohne solche Einheiten heißen die Ergebnisse Trainingsäquivalente und versprechen keine Wettkampfzeit. Die Karten nennen Datenbasis und Modell.
- Das Dreimonatsfenster und die Fehlergrenze von 10 % sind konservative Produktregeln, keine statistischen Konfidenzintervalle.
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
- Bei mindestens drei ausreichend unterschiedlichen Ankern sind ein Critical-Speed-Modell und ein individuell angepasstes Potenzgesetz die Kandidaten; gewählt wird das gültige Modell mit dem kleineren Leave-one-out-Fehler, sofern dieser höchstens 10 % beträgt.
- Fehlt diese Streuung, reicht ein kontinuierlicher Lauf zwischen 5 km und 21,1 km für eine Hochrechnung mit dem festen Riegel-Exponent 1,06. Unter mehreren passenden Läufen liefert die stärkste auf 5 km normierte Leistung den Modellanker; alle passenden Läufe werden als bestätigende Datenbasis ausgewiesen.
- Die durchschnittliche Herzfrequenz bleibt als Trainingskontext erhalten, korrigiert die Hochrechnung aber nicht. Ohne Maximalpuls oder individuelle Zonen lässt sich aus einem niedrigeren oder höheren Durchschnittspuls keine belastbare Wettkampfleistung ableiten.

### Schwimmen

- Zielzeiten: 750 m und 1.500 m.
- Bevorzugt wird Critical Swim Speed aus passenden starken 200-m- und 400-m-Leistungen aus zwei markierten maximalen Tests. Ohne Testmarkierung ist mindestens eine weitere Stützeinheit erforderlich. Alle Stützwerte müssen innerhalb von 10 % zur CSS-Schätzung liegen.
- Falls CSS nicht anwendbar ist, wird bei mindestens drei unterschiedlichen Distanzen ein individuelles Potenzgesetz mit höchstens 10 % Leave-one-out-Fehler verwendet.

### Radfahren

- Bei mindestens drei geeigneten Leistungs-Dauer-Ankern zwischen 2 und 20 Minuten wird Critical Power mit W′ berechnet. Stützwerte dürfen höchstens 10 % vom Modell abweichen.
- Angezeigt wird Critical Power in Watt und, falls Gewicht gesetzt ist, in W/kg. Critical Power wird nicht in eine Distanzzeit umgerechnet.
- Ohne ausreichende Leistungsdaten werden 20-km- und 40-km-Zeiten aus vergleichbaren Distanz-Zeit-Ankern per Potenzgesetz mit höchstens 10 % Leave-one-out-Fehler geschätzt; die 20-km-Zeit ist die Hauptkennzahl.

### Fortschrittsanzeige

- Jede geeignete kontinuierliche Einheit bleibt als Punkt sichtbar.
- Disziplinindizes starten in der ersten berechenbaren Woche bei 100.
- Ein Gesamtindex wird als gleich gewichtetes geometrisches Mittel gebildet, jedoch nur wenn für alle drei Disziplinen ein Index vorliegt.
- Konkrete geschätzte Zeiten beziehungsweise Radleistung werden zusätzlich dargestellt.
- Hauptdiagramme besitzen die Bereiche 4 Wochen, 12 Wochen, 6 Monate, 1 Jahr und Gesamt. Die Leistungs- und Fortschrittsdiagramme bieten zusätzlich eine zugängliche tabellarische Textalternative.

## Seitenaufbau

Die Tracker-Seite besitzt die Tabs Kalender, Tagebuch und Statistik sowie die Hauptaktion `Training eintragen`. Der Wochenkalender zeigt ab 768 Pixeln alle sieben Tage nebeneinander; auf Tablet-Breiten steht die Wochensumme darunter. Die Statistik bündelt Wochenkennzahlen, Hochrechnungen, Modellhinweise und Diagramme.

Formulare öffnen in vorhandenen Dialogen. Die Trainingseingabe zeigt zuerst Datum, Disziplin, Kontext, Dauer, Distanz, Pace und durchschnittliche Herzfrequenz. Leistung, RPE und Intervalle liegen im aufklappbaren Bereich `Weitere Angaben`. Die Seite funktioniert kompakt auf Desktop, Tablet und Mobilgeräten, unterstützt Tastatur und Dark Mode und erzeugt keine horizontale Seiten-Scrollleiste.

### Wissenschaftliche Grundlage

- [Vickers & Vertosick (2016): Laufzeitprognosen](https://pubmed.ncbi.nlm.nih.gov/27570626/): Riegel als begrenzte Distanzübertragung. 36 Minuten über 6 km ergeben mit Exponent 1,06 rund 29:40 über 5 km; eine zusätzliche Leistungsreserve eines lockeren Trainings ist daraus nicht ableitbar.
- [Systematischer Review zu Critical Speed (2025)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1520914/full): maximale Tests und vergleichbare Bedingungen sind wesentlich.
- [Stroke-Specific Swimming Critical Speed Testing (2024)](https://pubmed.ncbi.nlm.nih.gov/38380294/): 200-/400-m-Testverfahren; längere Zielzeiten bleiben Extrapolationen.
- [Power-duration relationship (2021)](https://pubmed.ncbi.nlm.nih.gov/34708276/): Critical Power und W′ statt einer universellen Watt-zu-Geschwindigkeit-Umrechnung. Distanzbasierte Radschätzungen setzen vergleichbare Strecke, Wind und Fahrbedingungen voraus.

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
