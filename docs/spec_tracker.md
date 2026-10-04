# Triathlon-Tracker

**Stand:** 3. Oktober 2026

**Route:** `/apps/triathlon-tracker`
**Status:** Live

## Ziel

Der Triathlon-Tracker ist eine reguläre App der BengtsToolBox. Er verwaltet Bestleistungen und Trainingsplanung für Schwimmen, Radfahren und Laufen. Gemessene Bestleistungen aus der gesamten Historie stehen neben begrenzten Hochrechnungen der aktuellen Leistungsfähigkeit; Trainingsvolumen und Verläufe ergänzen diese beiden Kernaufgaben.

Trainingspläne werden manuell angelegt. Die App generiert keine Pläne, gibt keine Coaching- oder Gesundheitsempfehlungen und bewertet keine Planerfüllung.

## Betriebsmodell

- Ein Tracker-Datensatz gehört zum aktuellen globalen beziehungsweise Lobby-Datenraum.
- Alle anonym angemeldeten Geräte einer Lobby dürfen denselben Datensatz bearbeiten.
- Die App verwendet die vorhandenen Firestore-Hooks, Firebase-Authentifizierung und den vorhandenen LocalStorage-Fallback.
- Zeitzone ist `Europe/Berlin`, die Woche beginnt montags und alle Einheiten werden metrisch angezeigt.
- Es gibt weder persönliche Konten noch Rollen oder Berechtigungen innerhalb einer Lobby.

## Umfang

### Leistungsoptionen

- Optionales aktuelles Gewicht in Kilogramm wird in der Rekordansicht gepflegt und für die Anzeige von Critical Power in W/kg verwendet.
- Schwimmen wird dort nach 25-m-Becken, 50-m-Becken oder Freiwasser, Radfahren nach Indoor oder Outdoor und Laufen nach Straße, Bahn oder Laufband getrennt betrachtet. Vorausgewählt sind 50-m-Becken, Outdoor und Straße. Die zielbezogene Testeingabe übernimmt den aktiven Rekordkontext; die allgemeine Trainingseingabe startet mit dem Standardkontext. Beim Bearbeiten eines älteren Eintrags ohne Kontext wird dieser Standard ebenfalls vorausgewählt und erst mit dem Speichern übernommen.
- Es gibt keinen separaten Einstellungsdialog.
- Keine Gewichtshistorie und keine weiteren Körper- oder Wearable-Messwerte.

### Bestleistungen

- `Rekorde` ist die Einstiegsansicht. Jede Disziplin zeigt ihre eigenen Kontextfilter, gemessene Rekorde mit Datum und daneben aktuelle Hochrechnungen mit Modell und Datenbasis.
- Rekorde beziehen sich auf die gesamte bisherige Historie im gewählten Kontext. Standardmäßig zählen nur als maximaler Leistungstest oder Wettkampf markierte Einheiten; die Rekordbasis ist auf alle Trainings umschaltbar. Diese Auswahl ändert die gemessenen Rekorde, nicht die automatische Modellwahl.
- Gemessene Zeitrekorde erfordern eine positive Dauer und exakt die Zieldistanz: Schwimmen 200, 400, 750 und 1.500 m; Radfahren 20 und 40 km; Laufen 1, 5 und 10 km, Halbmarathon (21.097,5 m) und Marathon (42.195 m).
- Radleistungsrekorde erfassen die höchste positive Durchschnittsleistung über exakt 5 beziehungsweise 20 Minuten. Eine höhere Leistung über eine kürzere Einheit ersetzt keinen längeren Rekord.
- Ganze Einheiten liefern keine Bestzeiten beliebiger Teilstrecken. Intervalle zählen weder als Rekord noch als Modellanker. Fehlende Messungen werden als `—` angezeigt.
- Die Aktion `+` an einer Zielstrecke beziehungsweise Leistungsdauer öffnet den Trainingseintrag mit vorausgewählter Disziplin, Kontext, Distanz oder Dauer und Testmarkierung. Bestehende Rekorde öffnen ihren ursprünglichen Eintrag zur Bearbeitung.
- Hochrechnungen verwenden weiterhin höchstens die letzten drei Monate. Werte außerhalb der Ankerdistanzen tragen eine Extrapolationsmarkierung; nicht gestützte Ziele bleiben leer.

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
- Markierung als maximaler Leistungstest oder Wettkampf,
- disziplinspezifischer Kontext:
  - Schwimmen: 25-m-Becken, 50-m-Becken oder Freiwasser,
  - Radfahren: Indoor oder Outdoor,
  - Laufen: Straße, Bahn oder Laufband,
- strukturierte Intervalle mit Belastungs- und Pausenabschnitten; je Abschnitt optional Dauer, Distanz, Durchschnittspuls und Durchschnittsleistung.

Intervalle werden ausschließlich über Eingabefelder aufgebaut. Es gibt keinen Textparser. Einheiten lassen sich nachträglich bearbeiten und löschen.

Je zwei positive Angaben aus Dauer, Distanz und Durchschnittspace berechnen die dritte Größe. Maßgeblich sind die beiden zuletzt manuell bearbeiteten Felder; unvollständige Eingaben leeren die daraus berechnete Größe. Dauer lässt sich sekundengenau als `m:ss` oder `h:mm:ss` sowie als Dezimalminuten eingeben, auch für Planungen und Intervallabschnitte. Bearbeiten und Speichern erhalten die Sekunden. Gespeichert werden weiterhin Dauer und Distanz; die Pace bleibt ein daraus abgeleiteter Wert.

### Planung, Tagebuch und Verlauf

- Vier Tabs trennen `Rekorde`, `Planung`, `Tagebuch` und `Verlauf`.
- Der Kalender zeigt ausschließlich geplante Einheiten; absolvierte Einheiten erscheinen dort nicht.
- Monats- und Wochenansicht beginnen montags; die Woche ist vorausgewählt. Ab 768 Pixeln zeigt die Woche sieben gleich breite Tagesspalten mit mehreren Trainingskarten und darunter die Wochensumme für Dauer und Anzahl sowie Dauer je Disziplin. Im Desktop-Monat steht die Wochensumme neben jeder Woche.
- Mobil und auf Tablets: kompaktes Monatsgitter mit ausgewählter Tagesagenda; die Wochenansicht zeigt sieben Tage untereinander.
- Der heutige Tag wird markiert. Navigation über Heute, Vor/Zurück und eine direkte Datumsauswahl.
- Tagesaktionen öffnen den Planeditor. Eine einzelne Einheit lässt sich als bearbeitbare Kopie übernehmen; ganze Wochen werden weiterhin nach Vorschau kopiert.
- Drag-and-drop verschiebt Planungen zwischen sichtbaren Tagen. Das Datumsfeld im Editor erlaubt dieselbe Änderung auf Touch-Geräten und per Tastatur.
- Das Tagebuch zeigt auf Desktop eine verdichtete Tabelle mit Datum, Disziplin/Kontext, Dauer, Distanz, Pace, optionalen Messwerten und Aktionen. Mobil verwendet dasselbe Markup Karten mit drei nebeneinanderstehenden Hauptmesswerten. Puls, Leistung, RPE, Kontext und Zahl der Intervallabschnitte bleiben sichtbar. Maximaltests tragen eine eigene Markierung.
- Filter für Disziplin, Datumsbereich und Maximaltests, umkehrbare Datumssortierung und Seiten zu 20 Einträgen erschließen auch ältere Datensätze. Die Gesamtsumme zeigt Anzahl und Zeit; eine Summendistanz erscheint nur bei gewählter Disziplin.
- Die kompakte Erfassungsmaske zeigt Datum, Zeit, Disziplin, Kontext, Dauer, Distanz, Pace, Herzfrequenz, Leistung, RPE und Testmarkierung direkt. Intervalle liegen in einem aufklappbaren Bereich. Normale Trainingseinträge öffnen nach dem Speichern das Tagebuch; zielbezogene Rekordeingaben und Rekordbearbeitungen kehren zur Rekordansicht zurück. Ihr gewählter Kontext bleibt beim Tabwechsel erhalten. Bearbeiten und Löschen bleiben möglich.
- Disziplinfarben bleiben über Rekorde, Planung, Tagebuch und Verlauf konsistent. Die vorhandenen Leistungsmodelle und Speicherpfade bilden weiterhin die kanonischen Implementierungen.

### Wochenstatistik

Für die aktuelle Woche zeigt die App:

- gesamte Trainingszeit,
- Zeit, Distanz und Anzahl je Disziplin.

Die vier gleich breiten Kennzahlen für Woche, Schwimmen, Radfahren und Laufen verwenden disziplinspezifische Farben aus dem Toolbox-Farbraum. Sie stehen bei vorhandenen Trainings über den App-Tabs. Die Ansicht `Verlauf` fasst zusätzlich den gewählten Zeitraum zusammen. Ihr gestapeltes Wochenvolumen zeigt standardmäßig Trainingszeit und ist auf Distanz umschaltbar; es besitzt keine zusätzliche Tabellenansicht. Darunter stehen Leistungsdiagramme mit einzelnen Trainingspunkten und Modellkurven. Zeitachsen bilden tatsächliche Datumsabstände ab; Laufen und Schwimmen zeigen Pace statt Geschwindigkeit. Der normalisierte Fortschrittsindex liegt im aufklappbaren Bereich. Eine Planerfüllungsquote oder Belastungsmetrik wird nicht berechnet.

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

- Die Rekordansicht fragt 1, 5 und 10 km, Halbmarathon und Marathon an; der Verlauf verwendet weiterhin 5 und 10 km als vergleichbare Hauptkennzahlen.
- Bei mindestens drei ausreichend unterschiedlichen Ankern wird ein individuell angepasstes Potenzgesetz geprüft. Critical Speed ist nur bei Ankerdauern von 2 bis 20 Minuten ein zusätzlicher Kandidat; gewählt wird das gültige Modell mit dem kleineren Leave-one-out-Fehler, sofern dieser höchstens 10 % beträgt.
- Fehlt diese Streuung, reicht ein kontinuierlicher Lauf zwischen 5 km und 21,1 km für eine Hochrechnung mit dem festen Riegel-Exponent 1,06. Unter mehreren passenden Läufen liefert die stärkste auf 5 km normierte Leistung den Modellanker; alle passenden Läufe werden als bestätigende Datenbasis ausgewiesen.
- Die durchschnittliche Herzfrequenz bleibt als Trainingskontext erhalten, korrigiert die Hochrechnung aber nicht. Ohne Maximalpuls oder individuelle Zonen lässt sich aus einem niedrigeren oder höheren Durchschnittspuls keine belastbare Wettkampfleistung ableiten.
- Zusätzliche Zielstrecken dürfen höchstens doppelt so lang sein wie der längste Modellanker. Kürzere Ziele unter 5 km benötigen einen Anker von höchstens der doppelten Zieldistanz. Critical Speed erzeugt keine Ziele über 10 km. Ein Marathon wird aus kürzeren Distanzen nicht extrapoliert. Diese Grenzen sind konservative Produktregeln und keine wissenschaftlichen Unsicherheitsintervalle.

### Schwimmen

- Die Rekordansicht fragt 200, 400, 750 und 1.500 m an; der Verlauf verwendet 750 und 1.500 m als Hauptkennzahlen.
- Bevorzugt wird Critical Swim Speed aus passenden starken 200-m- und 400-m-Leistungen aus zwei markierten maximalen Tests. Ohne Testmarkierung ist mindestens eine weitere Stützeinheit erforderlich. Alle Stützwerte müssen innerhalb von 10 % zur CSS-Schätzung liegen.
- Falls CSS nicht anwendbar ist, wird bei mindestens drei unterschiedlichen Distanzen ein individuelles Potenzgesetz mit höchstens 10 % Leave-one-out-Fehler verwendet.
- Zielstrecken dürfen höchstens viermal so lang sein wie der längste Anker. Damit bleibt die bewusst markierte CSS-Extrapolation von 400 auf 1.500 m möglich; sie ist keine gemessene Bestzeit.

### Radfahren

- Bei mindestens drei geeigneten Leistungs-Dauer-Ankern zwischen 2 und 20 Minuten wird Critical Power mit W′ berechnet. Stützwerte dürfen höchstens 10 % vom Modell abweichen.
- Angezeigt wird Critical Power in Watt und, falls Gewicht gesetzt ist, in W/kg. Die Rekordansicht ergänzt modellierte 5-/20-Minuten-Leistung aus CP und W′. Critical Power wird nicht in eine Distanzzeit umgerechnet.
- Unabhängig davon werden 20-km- und 40-km-Zeiten aus vergleichbaren Distanz-Zeit-Ankern per Potenzgesetz mit höchstens 10 % Leave-one-out-Fehler geschätzt, sofern die Daten ausreichen. In der Rekordansicht dürfen sie höchstens doppelt so lang sein wie der längste Anker. Der Verlauf verwendet CP oder, ohne ausreichende Leistungsdaten, die 20-km-Zeit als Hauptkennzahl.

### Fortschrittsanzeige

- Jede geeignete kontinuierliche Einheit bleibt als Punkt sichtbar.
- Disziplinindizes starten in der ersten berechenbaren Woche bei 100.
- Ein Gesamtindex wird als gleich gewichtetes geometrisches Mittel gebildet, jedoch nur wenn für alle drei Disziplinen ein Index vorliegt.
- Konkrete geschätzte Zeiten beziehungsweise Radleistung werden zusätzlich dargestellt.
- Hauptdiagramme besitzen die Bereiche 4 Wochen, 12 Wochen, 6 Monate, 1 Jahr und Gesamt. Die Leistungs- und Fortschrittsdiagramme bieten zusätzlich eine zugängliche tabellarische Textalternative.

## Seitenaufbau

Die Tracker-Seite startet mit `Rekorde` und bietet außerdem `Planung`, `Tagebuch` und `Verlauf`. Die Hauptaktionen öffnen manuelle Planung und Trainingseintrag. Die Rekordansicht bündelt Rekorde, aktuelle Hochrechnungen, Kontextfilter, Gewicht und aufklappbare wissenschaftliche Quellen; die Verlaufsansicht bündelt Zeitraumkennzahlen und Diagramme.

Formulare öffnen in vorhandenen Dialogen und verwenden zwei kompakte Feldspalten. Die Trainingseingabe zeigt alle Hauptmesswerte direkt; nur Intervalle werden aufgeklappt. Die Seite funktioniert kompakt auf Desktop, Tablet und Mobilgeräten, unterstützt Tastaturbedienung, verwendet die gemeinsamen Design-Tokens und erzeugt keine horizontale Seiten-Scrollleiste.

### Wissenschaftliche Grundlage

- [Vickers & Vertosick (2016): Laufzeitprognosen](https://pubmed.ncbi.nlm.nih.gov/27570626/): Riegel als begrenzte Distanzübertragung. 36 Minuten über 6 km ergeben mit Exponent 1,06 rund 29:40 über 5 km; eine zusätzliche Leistungsreserve eines lockeren Trainings ist daraus nicht ableitbar.
- [Systematischer Review zu Critical Speed (2025)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1520914/full): maximale Tests und vergleichbare Bedingungen sind wesentlich.
- [Scott et al. (2024): Stroke-Specific Swimming Critical Speed Testing](https://pmc.ncbi.nlm.nih.gov/articles/PMC10875687/): 200-/400-m-Testverfahren; längere Zielzeiten bleiben Extrapolationen.
- [Karsten et al. (2021): Validity and Reliability of Critical Power Field Testing](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.613151/full): Critical Power und W′ statt einer universellen Watt-zu-Geschwindigkeit-Umrechnung. Distanzbasierte Radschätzungen setzen vergleichbare Strecke, Wind und Fahrbedingungen voraus.

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
- wiederkehrende Termine,
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
- Rekorde bleiben von Modellschätzungen getrennt, benötigen exakte Zielstrecken beziehungsweise -dauern und erhalten beim Bearbeiten die Sekundengenauigkeit.
- Unzureichende oder nicht vergleichbare Daten erzeugen keine scheinpräzise Hochrechnung.
- Fachlogik ist durch Unit-Tests, Firestore-Pfade und Regeln durch fokussierte Tests sowie die Oberfläche durch gerenderte Desktop- und Mobile-Prüfungen abgesichert.
