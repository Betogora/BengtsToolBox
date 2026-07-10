# BengtsToolBox – Produkt- und Systemspezifikation

> **Stand:** 10. Juli 2026  
> **Status:** aus dem aktuellen Laufzeitcode rekonstruiert  
> **Geltungsbereich:** gesamtes Repository

Diese Datei ist die zentrale Spezifikation von BengtsToolBox. Sie vereint Produktumfang, fachliches Ist-Verhalten, Architekturregeln, Entwicklungsvertrag und Betrieb. Der aktuelle Code bleibt für Implementierungsdetails maßgeblich. Abweichungen zwischen Code und dieser Datei müssen im selben Änderungssatz behoben werden.

Die visuell aufbereitete Lesefassung steht in [`specs.html`](specs.html). Nachweisbare technische Lücken und sinnvolle nächste Schritte stehen getrennt in [`todo.md`](todo.md).

## 1. Produktauftrag

BengtsToolBox ist ein deutsch- und englischsprachiger App-Hub für private Spieleabende, Gruppen, Quizrunden und kleine Turniere. Die Anwendung stellt mehrere unabhängige Werkzeuge in einer gemeinsamen responsiven React-SPA bereit.

### 1.1 Ziele

- Werkzeuge ohne Konto- oder Einrichtungsdialog direkt nutzbar machen.
- Gemeinsame Zustände auf mehreren Geräten in Echtzeit synchronisieren, wenn Firebase konfiguriert ist.
- Dieselben Werkzeuge ohne Firebase lokal im Browser nutzbar halten.
- Bedienoberflächen für Mobilgeräte, Desktop und Presenter-/Beameransichten bereitstellen.
- Neue reguläre Apps über eine einzige Registry in Dashboard, Routing und Lazy Loading integrieren.
- Fachlogik, Darstellung und Persistenz so trennen, dass Änderungen lokal nachvollziehbar bleiben.

### 1.2 Bewusste Grenzen

- Es gibt keinen eigenen Application Server und keine serverseitige Fachlogik.
- Es gibt keine persönlichen Konten, Rollen oder Mandanten.
- Anonymous Auth identifiziert eine Browsersitzung, autorisiert aber keine fachlichen Rollen.
- LocalStorage ist Fallback und Cache, keine vollständige Offline-Synchronisation oder Konfliktauflösung.
- Die Anwendung ist in der aktuellen Sicherheitskonfiguration für einen privaten Hub gedacht, nicht für sensible oder mandantengetrennte Daten.
- `Schlag den Raab` besitzt nur eine clientseitige Zugangsschranke; sie ist keine Sicherheitsgrenze.

## 2. Produktlandkarte und Routen

Das Dashboard unter `/` zeigt alle neun regulär registrierten Apps. Die Registry in `src/apps/registry.ts` ist die einzige Quelle für deren Metadaten, Routen und Lazy Loader. Der Sonderbereich `Schlag den Raab` ist bewusst nicht in der Registry enthalten.

| Bereich | Route | Registrierung | Kernzweck |
| --- | --- | --- | --- |
| Dashboard | `/` | Shell/Router | Einstieg, QR-Code und App-Kacheln |
| Glücksrad | `/apps/decision-wheel` | Registry | Gewichtete Zufallsauswahl |
| Coinflip | `/apps/coinflip` | Registry | Münzwurf mit Verlauf |
| Fortschritts-Dashboard | `/apps/progress-dashboard` | Registry | Ereignisbasierte Punktestände und Zeitverlauf |
| Scoreboard | `/apps/scoreboard` | Registry | Personen-, Team- und Änderungswertung |
| Live-Buzzer | `/apps/live-buzzer` | Registry | Transaktionssicherer Quiz-Buzzer |
| Sushi Map | `/apps/sushi` | Registry | Besuchte Länder und Bundesländer |
| Random Number Generator | `/apps/randomizer` | Registry | Zufällige Ganzzahl in einem Bereich |
| SK Anderten Turnier-App | `/apps/swiss-tournaments` | Registry | Swiss-, Rundenturnier-, Hand-and-Brain- und Mario-Kart-Turniere |
| Nächste Frage | `/apps/next-question` | Registry | Quizkarten mit verdeckter Antwort |
| Schlag den Raab | `/schlag-den-raab` | explizite Sonderroute | Zwei-Personen-Abendwertung |

Alle App-Seiten werden lazy geladen. Das Dashboard stößt das Vorladen einer App bei Fokus, Hover oder Touch an. Firebase Hosting muss unbekannte Pfade auf `/index.html` umschreiben, damit direkte App-URLs funktionieren.

## 3. Globale Produktanforderungen

### 3.1 Shell und Navigation

- Die Shell zeigt Branding, Dashboard-Link, Link zu `Schlag den Raab` und Sprachauswahl.
- Auf mittleren und großen Breiten ist die Navigation direkt sichtbar; mobil liegt sie in einem Menü.
- Jede reguläre App erhält Titel, Beschreibung, Status, Icon, URL und Lazy Loader ausschließlich über die Registry.
- Sonderrouten dürfen nur verwendet werden, wenn ein Bereich bewusst nicht als normale Dashboard-App erscheint.

### 3.2 Sprache und Formatierung

- Unterstützte Sprachen sind Deutsch (`de-DE`) und Englisch (`en-GB`).
- Deutsch ist die Standardsprache.
- Die Auswahl wird unter `bengtstoolbox.language` in LocalStorage gespeichert und auf `document.documentElement.lang` gespiegelt.
- Beide Übersetzungskataloge müssen dieselben flachen Keys enthalten.
- Sichtbare UI-Texte, ARIA-Texte, Dialoge, Toasts und Empty/Error States laufen über `useI18n()`.
- Gespeicherte Eigennamen und fachliche Benutzereingaben werden nicht übersetzt.
- Datum, Uhrzeit und Zahlen werden über `Intl` mit der aktiven Locale formatiert.

### 3.3 Presenter-Modus

- Apps mit zuschauerrelevanter Ausgabe verwenden den gemeinsamen `PresenterLauncher`.
- Der Presenter ist ein read-only Fullscreen-Overlay; die normale Page bleibt die Steuerfläche.
- Ein einzelner View startet direkt, mehrere Views werden zuerst in einem Auswahlfenster angeboten.
- Der Modus versucht Browser-Fullscreen, bleibt aber als Overlay nutzbar, wenn Fullscreen blockiert wird.
- Escape beziehungsweise der sichtbare Beenden-Button schließen den Presenter und stellen den Fokus wieder her.
- Presenter verwenden aktuell: Glücksrad, Coinflip, Fortschritts-Dashboard, Scoreboard, Live-Buzzer, Sushi Map, Randomizer und Turnier-App.

### 3.4 UX und Barrierefreiheit

- Der erste Screen einer App zeigt das Werkzeug und keine Marketing-Landingpage.
- Die Oberfläche muss ab 320 Pixel Breite ohne unkontrolliertes horizontales Seiten-Scrolling funktionieren; fachlich breite Tabellen dürfen einen eigenen Scrollcontainer besitzen.
- Icon-only Buttons brauchen einen zugänglichen Namen.
- Formfelder brauchen sichtbare oder programmatisch verknüpfte Labels.
- Lade-, Leer-, Fehler- und lokaler Modus müssen verständlich darstellbar sein.
- Destruktive Aktionen benötigen eine angemessene Bestätigung.
- Farbe darf nie der einzige Informationsträger sein.
- Fokuszustände und Tastaturbedienung müssen sichtbar und funktionsfähig bleiben.
- Globale Typografie verwendet Manrope Variable und semantische `type-*`-Rollen aus `src/styles/globals.css`.

## 4. Persistenz- und Synchronisationsvertrag

### 4.1 Betriebsarten

Die Firebase-Initialisierung gilt als vollständig, wenn mindestens API-Key, Auth-Domain, Projekt-ID und App-ID vorhanden sind.

**Realtime-Modus:**

1. Der Client meldet sich anonym an.
2. `useFirestoreDoc` oder `useFirestoreCollection` abonniert einen Firestore-Snapshot.
3. Schreibaktionen aktualisieren zuerst React State und LocalStorage.
4. Danach wird Firestore mit `updatedAt: serverTimestamp()` geschrieben.
5. Eingehende Snapshots sind der kanonische gemeinsame Zustand.

**Lokaler Modus:**

- Fehlt die Konfiguration, liefern dieselben Hooks Daten ausschließlich aus LocalStorage.
- Die lokale User-ID wird einmal erzeugt und unter `app-hub:local-user-id` gespeichert.
- Es gibt keine geräteübergreifende Synchronisation.

### 4.2 Gemeinsame Interfaces

| Bedarf | Interface | Verhalten |
| --- | --- | --- |
| einzelner Dokumentzustand | `useFirestoreDoc<T>` | `data`, `save`, `merge`, Loading, Fehler, Realtime-Flag |
| geordnete Elemente | `useFirestoreCollection<T>` | Setzen, Mergen, Löschen, Sammelspeichern und Leeren; Standardreihenfolge `position` |
| Nutzerkennung | `useAnonymousSession` | Firebase UID oder lokale Fallback-ID |

LocalStorage-Schlüssel beginnen mit `app-hub:doc:` beziehungsweise `app-hub:collection:` und enthalten den vollständigen kanonischen Pfad.

### 4.3 Kanonische Firestore-Pfade

Firestore-Pfade dürfen nur in `src/lib/firebase/paths.ts` definiert werden.

| App | Dokumente | Collections |
| --- | --- | --- |
| Randomizer | `apps/randomizer/state/{stateId}` | – |
| Glücksrad | `apps/decision-wheel/state/{stateId}` | – |
| Coinflip | `apps/coinflip/state/{stateId}` | – |
| Nächste Frage | `apps/next-question/state/{stateId}` | – |
| Schlag den Raab | `apps/schlag-den-raab/sessions/{sessionId}/state/default` | – |
| Live-Buzzer | `apps/live-buzzer/sessions/{sessionId}/state/default` | `.../players` |
| Scoreboard | `apps/scoreboard/sessions/{sessionId}/state/default` | `.../players` |
| Fortschritts-Dashboard | `apps/progress-dashboard/sessions/{sessionId}/state/default` | `.../players`, `.../datasets` |
| Sushi Map | `apps/territory-map/sessions/{sessionId}/state/default` | `.../players`, `.../datasets` |
| Turnier-App | `apps/swiss-tournaments/sessions/{sessionId}/state/default` | `.../tournaments` |

Alle Hooks verwenden aktuell standardmäßig die State- oder Session-ID `default`.

### 4.4 Konsistenz und Fehler

- Schreibvorgänge sind lokal optimistisch.
- Der gemeinsame Cache löst keine konkurrierenden Änderungen auf; in Realtime ist der letzte kanonische Snapshot maßgeblich.
- Mehrere Dokumente oder Collections werden nicht automatisch atomar geändert.
- Der Live-Buzzer verwendet für den Gewinner-Buzz ausdrücklich eine Firestore-Transaktion.
- Auth-, Rules-, Netzwerk- und Snapshotfehler werden als `Error` an das jeweilige Feature weitergereicht.
- Features dürfen keine eigenen Firebase-Apps, Auth-Flows oder separaten LocalStorage-Fallbacks einführen.

## 5. App-Spezifikationen

### 5.1 Glücksrad

**Zweck:** Optionen verwalten und proportional zu einem Gewicht zufällig auswählen.

- Initial existieren drei Optionen mit Gewicht `1` und Farben aus der globalen Palette.
- Optionen können hinzugefügt, umbenannt, eingefärbt, gewichtet und entfernt werden.
- Gewichte werden auf ganze Zahlen gerundet und sind mindestens `1`.
- Leere Anzeigetexte fallen auf `Option {n}` zurück.
- Die Gewinnchance entspricht `Gewicht / Summe aller Gewichte`.
- Das Drehergebnis wird vor der Animation erzeugt und nach dem visuellen Abschluss gespeichert.
- Eine Drehung dauert 4,4 Sekunden plus 150 Millisekunden Settle-Zeit.
- Letztes Ergebnis und maximal fünf Verlaufseinträge werden gespeichert.
- Der Verlauf kann gelöscht; alle Optionen können auf die drei Beispiele zurückgesetzt werden.
- Der Presenter zeigt Rad, Ergebnis und Verlaufsumfang.

### 5.2 Coinflip

**Zweck:** fairer Zwei-Seiten-Münzwurf mit sichtbarer Animation.

- Seiten sind `Kopf` und `Zahl`.
- Wenn verfügbar, wird `crypto.getRandomValues` verwendet; andernfalls `Math.random`.
- Die Münze absolviert sechs volle Rotationen; die Animation dauert 1,7 Sekunden plus 120 Millisekunden Settle-Zeit.
- Ergebnis, Zeitstempel, letztes Ergebnis und maximal fünf Verlaufseinträge werden gespeichert.
- Der Verlauf kann vollständig zurückgesetzt werden.
- Der Presenter zeigt letztes Ergebnis und Verlauf.

### 5.3 Random Number Generator

**Zweck:** zufällige Ganzzahl in einem frei wählbaren inklusiven Bereich.

- Standardbereich ist `1` bis `6`.
- Eingaben werden auf Ganzzahlen abgerundet; ungültige Werte fallen auf `1` beziehungsweise `6` zurück.
- Vertauschte Grenzen werden automatisch als kleinere und größere Grenze gespeichert.
- Die Ziehung ist inklusiv: Minimum und Maximum können beide auftreten.
- Die Zufallsquelle ist `Math.random`.
- Letztes Ergebnis und maximal fünf Verlaufseinträge werden gespeichert.
- Der Verlauf kann gelöscht werden, ohne den Bereich zurückzusetzen.
- Der Presenter zeigt Bereich, letztes Ergebnis und Verlauf.

### 5.4 Nächste Frage

**Zweck:** Quizkarten nacheinander präsentieren, ohne die Antwort vorzeitig zu zeigen.

- Der statische NDJSON-Datensatz enthält 5.044 Fragen in zehn Kategorien.
- Jede Frage benötigt ID, Kategorie, Frage und Antwort; ungültige Datensätze verhindern das Laden.
- Der Katalog wird beim Öffnen der App als gehashtes NDJSON-Asset geladen und langfristig per HTTP sowie für die laufende Sitzung im Speicher gecacht. Ohne Service Worker bleibt Offline-Nutzung nach einem erfolgreichen Abruf best-effort; ein nicht verfügbarer Katalog zeigt einen wiederholbaren Fehlerzustand.
- Gespeichert werden Kartenposition und Sichtbarkeit der Antwort, nicht der Fragenkatalog.
- Vor und Zurück laufen zyklisch über Anfang und Ende des Katalogs.
- Ein direkter Sprung verwendet eine 1-basierte Kartennummer und begrenzt sie auf den gültigen Bereich.
- Jeder Kartenwechsel verbirgt die Antwort wieder.
- Die primäre Aktion zeigt zuerst die Antwort und wechselt beim nächsten Auslösen zur folgenden Frage.
- Tastatursteuerung unterstützt die primäre Aktion und Navigation.

### 5.5 Scoreboard

**Zweck:** Personen und Teams während eines Spieleabends bewerten.

- Initial existieren zwei Personen mit Score `0`, zugeordnet zu Team Blau und Team Gelb.
- Weitere Personen starten ohne Team und mit Score `0`.
- Namen werden getrimmt; leere Namen fallen auf `Person {position}` zurück.
- Scores sind nichtnegative ganze Zahlen.
- Änderungen um `0` und Änderungen unter `0` werden blockiert.
- Jede erfolgreiche Änderung speichert vorherigen und neuen Score, Delta, Person, Team/Farbe und Zeitstempel.
- Maximal zehn Score-Ereignisse bleiben im Verlauf.
- Die letzte Scoreänderung kann rückgängig gemacht werden, solange die Person noch existiert.
- Personen können umbenannt, Teams zugeordnet oder entfernt werden.
- Abgeleitet werden Rangliste, führende Person, Gesamtscore, Teamscores, Mitgliederzahlen und nicht zugeordnete Scores.
- Reset setzt alle Scores auf `0` und löscht den Änderungsverlauf, erhält aber Personen und Teams.
- Der Presenter zeigt Rangliste, Führung und Teamzusammenfassung.

### 5.6 Live-Buzzer

**Zweck:** mehrere Geräte als Quiz-Buzzer mit eindeutiger Gewinnerermittlung verwenden.

- Jeder Browser erhält eine dauerhafte lokale Player-ID und automatisch eine Spielerkarte.
- Spieler besitzen Name, Position, optional Team Blau/Gelb und Buzz-Zeitpunkt.
- Eine Runde kann geöffnet, gesperrt oder zurückgesetzt und unmittelbar wieder geöffnet werden.
- Beim Öffnen werden sichtbare Buzzes gelöscht, die Rundennummer erhöht und der Gewinner zurückgesetzt.
- Nur aktive Spieler dürfen in einer offenen Runde buzzern; jeder Spieler höchstens einmal.
- Im Firebase-Modus entscheidet eine Firestore-Transaktion, welcher Buzz zuerst den noch freien Gewinner setzt.
- Spätere gültige Buzzes bleiben für die Reihenfolge sichtbar, ändern aber den Gewinner nicht.
- Im lokalen Modus wird dieselbe Gewinnerregel ohne geräteübergreifende Atomarität ausgeführt.
- Die Buzzreihenfolge wird aus Server-Timestamp beziehungsweise Client-ISO-Zeit abgeleitet.
- Maximal fünf Rundengewinner bleiben im Verlauf.
- Entfernt ein Browser seine eigene Spielerkarte, erhält er automatisch eine neue Identität.
- Optionaler Sound und Presenter-Liveansicht sind reine UI-Zustände.

### 5.7 Fortschritts-Dashboard

**Zweck:** wiederkehrende Ereignisse pro Person erfassen und als Stand sowie Zeitreihe darstellen.

- Initial existieren fünf Personen mit stabiler Position, Farbe und Standardereignis `Bier`.
- Ereignistypen sind Plus, Minus, Wein, Bier, Schnaps und Trichter.
- Wein, Bier und Trichter zählen standardmäßig `1`; Schnaps zählt `0,5`.
- Events speichern Personensnapshot, Farbe, Delta, Icon, Zeit und Position.
- Der Score wird chronologisch aus Events berechnet und niemals unter `0` abgesenkt.
- Namen, Farben und Standard-Getränkeicon einer Person sind editierbar.
- Das Entfernen einer Person löscht vorhandene Events nicht; Archive können Personen daraus rekonstruieren.
- Eventzeit, Icon und Wert können korrigiert; Events können gelöscht werden.
- Ein Datensatz besitzt Name, Diagrammtitel, Einheit, Status und Events.
- Änderungen der Einheit aktualisieren einen noch automatisch abgeleiteten Diagrammtitel mit.
- „Archivieren und neu starten“ kopiert den aktiven Datensatz mit Zeitnamen ins Archiv und erzeugt einen leeren aktiven Datensatz.
- Archive können umbenannt und gelöscht werden.
- Desktop zeigt ein interaktives Zeitdiagramm; mobil stehen Rang- und Timeline-Ansichten bereit.
- Der Presenter zeigt Stand, Führung, Eventzahl und Gesamtscore.

### 5.8 Sushi Map

**Zweck:** Sushi-Besuche in Weltländern und deutschen Bundesländern Personen zuordnen.

- Kartenräume sind Weltkarte mit 241 Territorien und Deutschlandkarte mit 16 Bundesländern.
- Initial existieren Bengt, Paul und `Sushi-Tourist 3` mit unterschiedlichen Farben.
- Die ersten zwei Personen können nicht entfernt werden; weitere Touristen sind anleg- und löschbar.
- Ein Besuch speichert Karte, Territorium, Personensnapshot, Farbe, Zeit und Position als Event.
- Der aktuelle Claim eines Territoriums stammt aus dessen jüngstem lokalen Kalendertag.
- Mehrere Personen können am selben jüngsten Tag gemeinsame Owner desselben Territoriums sein.
- „Unbesucht“ löscht alle Events des jüngsten Claim-Tages dieses Territoriums, nicht die ältere Historie.
- Eventdatum, Person und Territorium können korrigiert; einzelne Events können gelöscht werden.
- Namens- und Farbänderungen aktualisieren die Events des aktiven Datensatzes.
- Die Rangliste zählt pro Person alle aktuell gehaltenen Welt- und Deutschland-Claims.
- Zehn Achievements werden aus der Besuchshistorie abgeleitet, unter anderem Afrika, Deutschland, Nordics, Balkan, Amerika, Pazifik, Microstates, Japan und Berlin.
- Die Karte unterstützt Tastaturauswahl, Pointer-Drag, Pinch/Zoom und Zoomstufen `1`, `2`, `4`.
- Der Presenter zeigt aktive Karte, Claims, Legende und Rangliste.

### 5.9 SK Anderten Turnier-App

**Zweck:** kleine Turniere mit Paarungsgenerierung, Ergebnissen, Rangliste, Archiv und Export verwalten.

#### Gemeinsames Turniermodell

- Formate sind `Swiss`, `Round Robin`, `Hand and Brain` und `Mario Kart`.
- Spieler besitzen Namen, optionales Rating, initialen Seed, Status und Eintrittsrunde.
- Statuswerte sind aktiv, inaktiv und zurückgezogen. Zwischen allen drei Werten kann frei gewechselt werden; nur aktive Spieler werden neu ausgelost. Overrides können ab einer bestimmten Runde gelten.
- Seeding nach Rating sortiert absteigend. Der Modus „zufällig“ verwendet aktuell eine stabile Hash-Reihenfolge aus Name und Rating.
- Eine Runde ist `draft` oder `completed`. Bei Mario Kart können mehrere Draft-Runden als aktive Lobbys parallel bestehen; die übrigen Formate verändern nur die jüngste Draft-Runde.
- Eine Runde kann erst abgeschlossen werden, wenn alle Pairings vollständig gewertet sind.
- Neue aktive Turniere archivieren alle vorher aktiven Turniere.
- Reset archiviert eine Kopie und setzt Runden, Fortschritt und Spielerstatus des aktiven Turniers zurück.
- Turniere und Archive können als Ranglisten-CSV exportiert und über die Druckansicht als PDF ausgegeben werden.
- Der Presenter zeigt die aktuelle Rangliste.

#### Ergebnisse und Rangfolge

- Standardresultate sind `1-0`, `0-1`, `½-½` und kampflose Siege.
- Bye-Wertungen sind `1`, `0,5` oder `0` und können pro Runde überschrieben werden.
- Nicht-Mario-Kart-Rangfolge: Punkte, Buchholz, Sonneborn-Berger, Siege, direkter Vergleich, initialer Seed.
- Mario-Kart-Rangfolge: Turnierpunkte, Siege, bessere Durchschnittsplatzierung und direkter Vergleich. Vollständig gleiche sportliche Werte teilen sich den Rang nach `1, 1, 3`; Seed und Name stabilisieren nur die Anzeige.
- Ergebniskorrekturen dürfen eine noch ungewertete aktuelle Draft-Runde neu generieren; die UI muss davor warnen.
- Manuell fixierte Pairings bleiben bei einer Regenerierung erhalten, solange sie gültig sind. Mario-Kart-Fixierungen beziehen sich stattdessen auf eine noch nicht erzeugte zukünftige Lobby.

#### Swiss

- Runde 1 paart obere gegen untere Seed-Hälfte.
- Spätere Runden bilden Scoregruppen, verwenden bei Bedarf Floater und minimieren Punktdifferenzen.
- Wiederholungen werden vermieden, solange eine vollständige wiederholungsfreie Paarung existiert.
- Ist das nicht möglich, wird ein Vereins-Fallback mit harter Warnung erzeugt.
- Bei ungerader Spielerzahl erhält eine Person ein Bye. Bevorzugt werden wenige bisherige Härten, niedriger Score und niedriger Seed; die Policy kann Neueinsteiger schützen.
- Farben werden auf Wechsel, Serien von drei gleichen Farben und Gesamtdifferenz optimiert.

#### Round Robin

- Der Grundplan verwendet das Berger-System; bei ungerader Spielerzahl entsteht ein Dummy-Slot mit Bye.
- Ein oder mehrere Durchgänge sind möglich; Folgedurchgänge invertieren Farben.
- Die Rundenzahl ergibt sich aus aktiven Spielern und Durchgängen.
- Spieleränderungen werden durch Reparatur-Pairings ergänzt; bis 16 Spieler kann eine begrenzte exakte Suche verwendet werden.
- Kein Paar darf häufiger als die Zielzahl der Durchgänge gegeneinander spielen.

#### Hand and Brain

- Ein vollständiges Brett besteht aus vier verschiedenen Personen: je Hand und Brain auf Weiß und Schwarz.
- Der Generator gruppiert vorrangig nach Score und optimiert Teampaarungen, Rollenwechsel und Farbausgleich.
- Wiederholte Team-gegen-Team-Konstellationen sind harte Warnungen; wiederholte Partner oder Rollen sind Hinweise.
- Restklassen werden behandelt: bei Rest `1` oder `3` entsteht ein Bye, bei Rest `2` zusätzlich eine Einzelpartie.
- Bye und Einzelpartie werden gemeinsam als Härten fair verteilt.

#### Mario Kart

- Eine technische Runde entspricht genau einer Lobby mit exakt vier Fahrern. Die fachliche Wertungsrunde und die laufende Lobby werden als `Lobby 2.1` dargestellt.
- „Neue Lobby“ erzeugt pro Klick genau eine Aufstellung. Mehrere Lobbys dürfen aktiv sein, aber kein Fahrer darf gleichzeitig in zwei aktiven Lobbys sitzen.
- Aktive Wertungszuweisungen werden bereits für weitere Auslosungen berücksichtigt, beeinflussen Turnierpunkte, Siege und Durchschnittsplatz aber erst nach dem Abschluss.
- Die Auswahl priorisiert die älteste offene Wertungsrunde, ähnliche Turnierpunkte, wenige Gegnerwiederholungen, faire Füllereinsätze und ähnliche Durchschnittsplätze. Der Seed entscheidet nur die letzte deterministische Sortierung.
- Fehlen Fahrer für eine volle Lobby, werden Fahrer mit ihrer Wertung für die nächste geplante Wertungsrunde vorgezogen. Diese Füller werden dort nicht erneut eingeplant.
- Genau eine zukünftige Lobby kann mit zwei bis vier eindeutigen Fahrern fixiert werden. Die ausgewählten Fahrer warten aufeinander, bis sie aktiv und nicht anderweitig reserviert sind; andere Lobbys können währenddessen weiterlaufen. Freie Plätze werden regulär ergänzt. Fixierte Fahrer erhalten keine zusätzliche Wertung und tragen den Füller-Hinweis nur dann zusätzlich, wenn ihre nächste Wertungsrunde tatsächlich vorgezogen wird.
- Erst wenn keine weitere geplante Wertungsrunde existiert, ergänzen echte Extras mit `scoringCycleNumber: null` die Lobby. Extras bleiben bis zu einer möglichen späteren Bonus-Wertungsrunde ohne Turnierwertung.
- Beim Start einer Bonus-Wertungsrunde bleibt die konfigurierte Rundenzahl unverändert. Geeignete frühere Extras werden chronologisch rückwirkend dieser Bonusrunde zugeordnet und alle Wertungsstatistiken neu abgeleitet.
- Platzierungen werden als Zahlen `1` bis `24` erfasst und müssen innerhalb einer Lobby vollständig und eindeutig sein. Für Turnierpunkte und Siege zählt ihre relative Reihenfolge unter den vier menschlichen Fahrern; der tatsächliche Platz bleibt für den Durchschnitt erhalten. Mit der vierten gültigen Platzierung schließt die Lobby automatisch, Ranglisten und Turnierfortschritt werden unmittelbar aktualisiert.
- Geschlossene Lobbys können lokal bearbeitet und nur mit vier gültigen Plätzen atomar gespeichert werden; spätere Aufstellungen bleiben unverändert.
- Nur die jüngste vollständig ergebnislose aktive Lobby darf neu erzeugt oder gelöscht werden. Neu erzeugen übernimmt zwischenzeitliche Neuzugänge und Statusänderungen; eine enthaltene Fixierung bleibt erhalten.
- Inaktive und zurückgezogene Fahrer bleiben ausgeschlossen, bis sie reaktiviert werden. Währenddessen verpasste Wertungsrunden werden bewusst übersprungen und nicht nachgeholt; eine bereits aktive Lobby bleibt bis zum Neu-Erzeugen unverändert.
- Späteinsteiger erhalten ab ihrer Eintrittsrunde höchstens eine Wertung pro verbleibender konfigurierter Wertungsrunde. Der Turnierabschluss wird pro Wertungsrunde aus abgeschlossenen, übersprungenen und vor Eintritt liegenden Zuweisungen abgeleitet und benötigt keine Bonus-Lobby.
- Turnierpunkte nach relativer Platzierung der wertenden Fahrer: 4er `1 / 0,7 / 0,3 / 0`, 3er `1 / 0,5 / 0`, 2er `1 / 0`; ein einzelner wertender Fahrer neben Extras erhält `1`.
- Pro Fahrer kann optional ein Bier markiert werden. Die Markierung bleibt auch nach Lobbyabschluss direkt änderbar und beeinflusst weder Platzierung noch Lobby-Lebenszyklus. Gleiche Bieranzahlen teilen sich ebenfalls den Rang nach `1, 1, 3`.
- Rangliste, Presenter, Druckansicht und CSV verwenden dieselbe sportliche Reihenfolge und weisen physische sowie wertende Rennen getrennt aus.

#### Warnmodell

Pairings tragen harte oder weiche Warnungen. Abgedeckt werden unter anderem fehlende/inaktive/mehrfach verwendete Spieler, Wiederholung, Scoregruppen-Floater, zu große Punktdifferenz, Farbe, wiederholte Hand-and-Brain-Teams und -Rollen, unausgeglichene Mario-Kart-Lobbys sowie erneute Bye-Zyklen.

### 5.10 Schlag den Raab

**Zweck:** zwei Personen über 15 aufsteigend gewichtete Spiele und bei Bedarf ein Stechen bewerten.

- Der Bereich liegt außerhalb der Dashboard-Registry und ist über `/schlag-den-raab` erreichbar.
- Eine clientseitig fest codierte PIN schaltet die Route für die aktuelle `sessionStorage`-Sitzung frei. Dies verhindert keine technische Umgehung.
- Es existieren genau zwei Personen; Namen sind editierbar.
- Die 15 regulären Spiele tragen die Punkte `1` bis `15`; Titel sind editierbar.
- Ein Klick setzt oder entfernt den Gewinner eines Spiels und berechnet den kumulierten Score.
- Ein regulärer Sieger steht fest, sobald eine führende Person mehr als 60 Punkte besitzt.
- Sind nach allen 15 Spielen beide Scores gleich, erscheint Spiel 16 als Stechen mit 16 Punkten.
- Reset archiviert den gesamten Abend, behält die aktuellen Spielernamen und startet mit leeren Ergebnissen.
- Archive sind umbenennbar, lesbar und löschbar.
- Zwei deaktivierte Dummy-Game-Kacheln sind aktuell sichtbare Platzhalter, keine implementierten Spiele.

## 6. Architektur

### 6.1 Systemkontext

```mermaid
flowchart TB
  B["Browser"] --> SPA["React-SPA auf Firebase Hosting"]
  SPA --> AUTH["Firebase Anonymous Auth"]
  SPA --> DB[("Cloud Firestore")]
  SPA --> LS[("LocalStorage")]
  GH["GitHub Actions"] -->|"Build und Hosting-Deploy"| SPA
```

Vite baut statische Dateien, Firebase Hosting liefert sie aus. Es gibt keinen eigenen Serverprozess zur Laufzeit.

### 6.2 Schichten und Verantwortungen

| Bereich | Verantwortung | Darf nicht übernehmen |
| --- | --- | --- |
| `src/app` | Router, Lazy Routes, globale Provider | App-Fachlogik |
| `src/components/layout` | Shell und Dashboard | Persistenzlogik |
| `src/apps/registry.ts` | Metadaten und Loader regulärer Apps | Feature-Zustand |
| `src/apps/<app-id>` | UI, Hook, Typen und Fachlogik eines Features | eigene Firebase-Initialisierung |
| `src/apps/shared` | tatsächlich appübergreifende Modelle und Interaktionen | app-spezifische Sonderfälle |
| `src/components/ui` | generische UI-Primitiven | Geschäftslogik |
| `src/lib/firebase` | Client, Auth, Pfade, Sync und lokaler Cache | UI oder App-Regeln |
| `src/lib/i18n` | Sprache, Interpolation und Formatierung | fachliche Zustandsmigration |
| `src/styles` | globale Tokens, Typografie, Druckregeln | Feature-Zustand |

Abhängigkeiten zeigen von Page über Feature-Hook und pure Fachlogik zur gemeinsamen Infrastruktur. Gemeinsame Infrastruktur importiert keine App.

### 6.3 Typischer Datenfluss

```mermaid
sequenceDiagram
  participant P as Page
  participant H as Feature-Hook
  participant S as Sync-Hook
  participant L as LocalStorage
  participant F as Firestore
  P->>H: semantische Nutzeraktion
  H->>S: save / merge / setItem
  S->>L: optimistischer Cache
  S->>F: Schreibvorgang + serverTimestamp
  F-->>S: Realtime-Snapshot
  S-->>H: kanonischer Zustand
  H-->>P: abgeleitete Ansicht
```

### 6.4 Architekturentscheidungen

1. **Kein globaler State-Manager:** Feature-Hooks und Firestore-Snapshots decken den aktuellen Bedarf.
2. **Keine app-eigenen Firebase-Clients:** Eine Initialisierung verhindert divergierende Auth- und Cachezustände.
3. **Registry für reguläre Apps:** Navigation, Dashboard, Routing und Code-Splitting bleiben konsistent.
4. **Explizite Sonderrouten:** Versteckte oder anders strukturierte Bereiche werden nicht künstlich in die Registry gezwungen.
5. **Feature-lokale Wiederverwendung zuerst:** Shared Code entsteht erst bei echter Mehrfachnutzung.
6. **Pure Fachlogik außerhalb React:** Besonders Turnier-, Zufalls- und Auswertungsregeln bleiben unabhängig von UI und Persistenz.
7. **Code ist Detailquelle:** Dokumentation hält stabile Verträge fest und darf keine zweite, veraltete Implementierungserzählung werden.

## 7. Entwicklungsvertrag

### 7.1 Aufbau eines Features

Ein Feature besitzt nur die Dateien, die es tatsächlich benötigt:

```text
src/apps/<app-id>/
├── <AppName>Page.tsx
├── hooks/use<AppName>.ts
├── types.ts
├── logic.ts oder weitere pure Module   # optional
├── *.test.ts                           # optional, feature-nah
├── components.tsx                      # optional
├── data/                               # optional für große statische Daten
└── index.ts
```

- **Page:** Layout, Darstellung, Eingaben und Aufruf semantischer Aktionen.
- **Hook:** Zustand, Normalisierung, abgeleitete Werte, Aktionen und Persistenz.
- **Pure Module:** komplexe Regeln ohne React oder Firebase.
- **Index:** kleine öffentliche Feature-Interface.

### 7.2 Neue reguläre App integrieren

1. Kernaktion, Zustandsmodell, Lade-, Leer-, Fehler- und Wiederöffnungsverhalten festlegen.
2. Feature lokal anlegen und eine öffentliche Page über `index.ts` exportieren.
3. Bestehende UI-Primitiven, App-Layouts und echte Shared Modules wiederverwenden.
4. Persistenzbedarf als Dokument, geordnete Collection oder flüchtigen React State einordnen.
5. Neue Firestore-Pfade ausschließlich in `src/lib/firebase/paths.ts` ergänzen.
6. Sichtbare Texte in beiden Übersetzungskatalogen anlegen.
7. Reguläre App genau einmal in `src/apps/registry.ts` registrieren.
8. Mobile Bedienung, Tastatur, ARIA, Fehler, lokalen Modus und Destruktivbestätigungen prüfen.
9. Lint, automatisierte Tests, Build und risikogerechte Laufzeittests ausführen.

### 7.3 Code- und UI-Regeln

- Aktionen heißen fachlich (`addPlayer`, `finishRound`) und leaken keine Speicheroperationen in die Page.
- Initialwerte von Sync-Hooks bleiben referenziell stabil.
- Firestore-Serverzeit wird zentral geschrieben; Features dürfen ergänzende Client-ISO-Zeiten für Anzeige und Fallback speichern.
- Lucide Icons, globale Tokens und gemeinsame Controls werden bevorzugt.
- Feature-Layout bleibt in Komponenten; neue globale CSS-Regeln sind die Ausnahme.
- Presenter-Views bleiben read-only.
- Komplexe Regeln werden über ihr öffentliches Interface getestet; interne Implementierungsdetails sind keine eigene Testoberfläche.

### 7.4 Testsystem

Vitest läuft in einer Node-Umgebung und prüft pure Fachlogik ohne DOM, React-Renderer oder Firebase-Emulator. Tests liegen feature-nah als `*.test.ts`; ausschließlich gemeinsam genutzte feste Turnier-Fixtures liegen unter `src/apps/swiss-tournaments/__tests__`. Produktion und Tests verwenden dieselben öffentlichen Interfaces.

Der P0-Testschnitt umfasst:

- Golden Cases für Swiss, Round Robin, Hand and Brain und Mario Kart;
- Turnierlebenszyklus, Byes, Statuswechsel, Ergebniskorrekturen, Bonusrennen, Rangfolgen und Fortschritt;
- Randomizer, Glücksrad und Münzwurf mit injizierbaren Zufallsquellen;
- fachliche Utilities für wertende Teilnehmer und Glücksrad-Eingaben.

Zufällige IDs und Zeitstempel sind keine Golden Values. Fixtures verwenden feste IDs und Ergebnisse; Assertions prüfen beobachtbare Paarungen, Rollen, Punkte, Warnungen und Zustandsübergänge. Neue Zufallslogik akzeptiert eine kleine feature-lokale Zufallsfunktion und behält `Math.random` beziehungsweise Web Crypto als Produktionsstandard.

```powershell
npm test
npm run test:watch
npm run test:coverage
```

`npm test` läuft einmalig und ist der Befehl für CI. `npm run test:watch` dient der lokalen Entwicklung. `npm run test:coverage` erzeugt einen nicht versionierten Text- und HTML-Bericht unter `coverage/`. Es gibt zunächst kein prozentuales Coverage-Gate; die dokumentierte Szenariomatrix ist das Abnahmekriterium. Browser-, Komponenten-, Firebase-Emulator- und Rules-Tests gehören nicht zu diesem P0-Schnitt.

### 7.5 Verifikation und Definition of Done

Mindestens für Codeänderungen:

```powershell
npm run lint
npm test
npm run build
```

Bei Firebase- oder Sync-Änderungen zusätzlich:

1. ohne `.env.local` im lokalen Modus prüfen;
2. mit Firebase dieselbe App in zwei Fenstern prüfen;
3. Reload und Persistenz prüfen;
4. Auth-, Rules-, Netzwerk- und sichtbare Fehlerzustände prüfen.

Eine Änderung ist fertig, wenn Registry oder Sonderroute korrekt, Persistenz zentral, gemeinsamer Code nicht dupliziert, UI-Zustände verständlich und Lint, Tests sowie Build erfolgreich sind. Dokumentation wird nur angepasst, wenn sich dauerhafter Kontext oder ein spezifiziertes Verhalten ändert.

## 8. Lokale Entwicklung

Voraussetzung ist Node.js 22 oder neuer. Der reservierte lokale Port ist `5180`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

Ohne ausgefüllte `.env.local` startet die App absichtlich im lokalen Modus. Weitere Befehle:

```powershell
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run build
npm run preview
```

`npm run test:coverage` schreibt den lokalen HTML-Bericht nach `coverage/`. `npm run build` führt `tsc -b` und danach den produktiven Vite-Build aus.

## 9. Hosting und Betrieb

### 9.1 Laufzeitkonfiguration

| Variable | Zweck |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web-App-Konfiguration |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web-App-Konfiguration |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Web-App-Konfiguration |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Web-App-Konfiguration |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web-App-Konfiguration |
| `VITE_FIREBASE_APP_ID` | Firebase Web-App-Konfiguration |

Lokal stehen Werte in der nicht versionierten `.env.local`; GitHub Actions liest sie aus Repository Secrets. In ein Secret gehört nur der Wert, nicht `NAME=value`.

Zusätzlich benötigt GitHub:

- Secret `FIREBASE_SERVICE_ACCOUNT_BENGTSTOOLBOX` für Hosting,
- Repository Variable `FIREBASE_PROJECT_ID=bengtstoolbox`.

### 9.2 Deploy-Pfade

| Ereignis | Workflow | Ergebnis |
| --- | --- | --- |
| Push auf `main` oder manueller Start | `.github/workflows/firebase-hosting.yml` | Live-Hosting |
| interner Pull Request | `.github/workflows/firebase-hosting-pull-request.yml` | temporärer Preview Channel |

Beide Workflows verwenden Node 22.23.1 und führen nach `npm ci` zuerst `npm test`, anschließend den Produktions-Build und nur bei Erfolg das Firebase-Hosting-Deployment aus. Hosting veröffentlicht `dist`; `firebase.json` enthält das SPA-Rewrite.

Firestore Rules und Indizes werden aktuell separat ausgerollt:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Hosting kann manuell mit folgendem Befehl ausgerollt werden:

```powershell
npx firebase-tools deploy --only hosting
```

### 9.3 Erstverknüpfung

Nur bei einer neuen Firebase-/GitHub-Einrichtung:

```powershell
npx firebase-tools login
npx firebase-tools use bengtstoolbox
npx firebase-tools init hosting:github
```

Erwartete Werte: Repository `Betogora/BengtsToolBox`, Build `npm ci && npm run build`, Public Directory `dist`, SPA `ja`, Produktionsbranch `main`. Bestehende Dateien dürfen nicht blind überschrieben werden.

### 9.4 Nach dem Deploy

1. Live- oder Preview-URL öffnen.
2. Eine verschachtelte Route direkt laden, etwa `/apps/scoreboard`.
3. Eine synchronisierte App in zwei Fenstern ändern.
4. Reload und Persistenz prüfen.
5. Browser-Konsole auf Auth-, Rules- und Netzwerkfehler prüfen.

### 9.5 Fehlerdiagnose

| Symptom | Wahrscheinliche Ursache | Prüfung |
| --- | --- | --- |
| `npm ci` schlägt fehl | Lockfile und `package.json` divergieren | lokal `npm ci` |
| Build schlägt fehl | TypeScript- oder Bundlefehler | `npm run build` |
| Projekt im Workflow fehlt | Repository Variable fehlt/falsch | `FIREBASE_PROJECT_ID` |
| Hosting nicht autorisiert | Service-Account fehlt oder hat falsche Rechte | Secret und Firebase IAM |
| `auth/api-key-not-valid` | Web-Konfiguration fehlt oder enthält Zusatztext | `VITE_FIREBASE_API_KEY` |
| `Missing or insufficient permissions` | Anonymous Auth aus oder Rules nicht deployed | Auth-Anbieter und Rules-Deploy |
| direkte Unterseite liefert 404 | SPA-Rewrite fehlt | `firebase.json` und aktives Hosting-Ziel |
| App synchronisiert nicht | Firebase-Konfiguration beim Build unvollständig | Workflow-Environment und Browserkonsole |

## 10. Sicherheitsgrenze

Die Firestore Rules erlauben jedem authentifizierten, also auch jedem anonym authentifizierten Client Lesen und Schreiben unter `apps/{appId}/...`. Es gibt keine feld-, session- oder rollenbasierte Einschränkung. Der PIN-Gate von `Schlag den Raab` liegt vollständig im ausgelieferten Client und schützt weder Route noch Firestore-Daten technisch.

Vor öffentlicher Nutzung mit sensiblen Daten müssen Datenräume, Identitäten, Claims und Rules enger modelliert und mit Emulator-/Rules-Tests abgesichert werden. Die priorisierten Arbeiten dazu stehen in [`todo.md`](todo.md).
