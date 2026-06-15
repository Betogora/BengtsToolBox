# Swiss-Turniere: Hinweise und Reihenfolge der Randbedingungen

## Kurzfassung

Die steigende Zahl an Hinweisen entsteht, wenn die automatische Paarung nicht mehr alle Ziele gleichzeitig erfuellen kann. Das ist besonders bei spaeteren Runden normal: Es gibt weniger neue Gegnerkombinationen, die Scoregroups werden kleiner, Farbwiederholungen haufen sich, und im Hand-and-Brain-Modus muessen zusaetzlich Team-, Duo- und Rollenbedingungen beachtet werden.

Ein Hinweis bedeutet nicht automatisch, dass die Paarung falsch ist. Er zeigt, welche Bedingung verletzt oder nur mit Abstrich erfuellt wurde. Harte Hinweise markieren echte Regel- oder Datenprobleme, weiche Hinweise markieren Qualitaetsabstriche.

## Bedeutung der Hinweise

| Anzeige | Interner Hinweis | Bedeutung | Gewicht |
| --- | --- | --- | --- |
| OK | - | Fuer diese Paarung wurde kein sichtbarer Hinweis gefunden. | - |
| FIXIERT | manuell fixierte Paarung | Diese Paarung wurde manuell gesetzt und wird bei der automatischen Paarung nicht veraendert. | manuell |
| BYE | `multiple-byes` | Der Spieler hatte bereits mehr Byes als mindestens ein anderer aktiver Spieler. | weich |
| BYE | `bye-cycle-restarted` | Alle aktiven Spieler hatten bereits gleich viele Byes; ein neuer Bye-Zyklus beginnt. | weich |
| FARBE | `third-color` | Ein Spieler wuerde zum dritten Mal in Folge dieselbe Farbe bekommen. | weich |
| FARBE | `color-imbalance` | Die Gesamt-Farbdifferenz eines Spielers wuerde groesser als 2. | weich |
| FLOATER | `forced-floater` | Die Paarung verbindet Spieler aus unterschiedlichen Scoregroups. | weich |
| ABSTAND | `large-point-gap` | Die Punktdifferenz zwischen Spielern oder Hand-and-Brain-Seiten ist groesser als 1. | weich |
| FALLBACK | `non-fide-fallback` | Die Paarung ist nur als Vereins-Fallback moeglich, typischerweise weil sonst keine vollstaendige Paarung gefunden wurde. | hart |
| REPEAT | `repeat-pairing` | Diese Spieler haben bereits gegeneinander gespielt. | hart |
| DUO | `repeat-hand-brain-partner` | Zwei Spieler waren bereits auf derselben Hand-and-Brain-Seite. | weich |
| ROLLE | `repeat-hand-brain-roles` | Dasselbe Duo hatte bereits dieselbe Brain/Hand-Verteilung. | weich |
| TEAM | `repeat-hand-brain-team` | Dieselbe Team-gegen-Team-Konstellation gab es bereits. | hart |
| DOPPELT | `duplicate-round-player` | Ein Spieler ist in derselben Runde mehrfach eingeteilt. | hart |
| FEHLT | `missing-player` | Eine Paarung ist unvollstaendig oder verweist auf einen fehlenden Spieler. | hart |
| INAKTIV | `inactive-player` | Ein eingeteilter Spieler ist in dieser Runde nicht aktiv. | hart |
| SPIELER | `same-player` | Ein Spieler wurde gegen sich selbst gepaart. | hart |
| STOPP | unbekannter harter Hinweis | Fallback-Anzeige fuer harte Hinweise ohne eigene Badge-Definition. | hart |
| HINWEIS | unbekannter weicher Hinweis | Fallback-Anzeige fuer weiche Hinweise ohne eigene Badge-Definition. | weich |

## Aktuelle Reihenfolge der Randbedingungen

### 1. Turnierformat waehlen

Die Paarungslogik verzweigt zuerst nach Format:

1. Rundenturnier
2. Hand-and-Brain
3. normales Schweizer System

Die folgenden Punkte beschreiben vor allem Schweizer System und Hand-and-Brain, weil dort die meisten Hinweise entstehen.

### 2. Bereits fixierte Paarungen reservieren

Manuell fixierte Paarungen werden zuerst uebernommen. Alle darin verwendeten Spieler werden aus dem automatischen Pool entfernt. Die fixierten Paarungen werden validiert und koennen deshalb trotzdem Hinweise tragen, zum Beispiel `REPEAT`, `FARBE`, `DOPPELT` oder `INAKTIV`.

### 3. Aktive Spieler bestimmen

Nur Spieler, die in der Runde bereits hinzugefuegt und aktuell aktiv sind, kommen in den automatischen Pool. Danach wird nach Punkten absteigend und bei Gleichstand nach Startnummer aufsteigend sortiert.

### 4. Bye vergeben

Wenn die Spielerzahl fuer das Format nicht aufgeht, werden vor der eigentlichen Paarung Bye und Einzelbrett als Ausgleich vergeben.

Beim normalen Schweizer System passiert das bei ungerader Poolgroesse. Bei Hand-and-Brain passiert es, wenn die Spielerzahl modulo 4 gleich 1 oder 3 ist.

Bye-Auswahl:

1. Nur Spieler mit der niedrigsten bisherigen Bye-Zahl sind Kandidaten.
2. Bei aktivierter Schutzregel fuer Spaeteinsteiger werden neue Spieler der aktuellen Runde nach Moeglichkeit geschuetzt.
3. Unter den verbleibenden Kandidaten bekommt der Spieler mit der niedrigsten Punktzahl das Bye.
4. Bei Punktgleichheit entscheidet die hoehere Startnummer.

Einzelbrett-Auswahl im Hand-and-Brain-Modus:

1. Wenn nach dem optionalen Bye noch zwei Spieler ueber eine Viererteilung hinaus uebrig bleiben, wird ein Einzelbrett erzeugt.
2. Zuerst werden Spieler mit den wenigsten bisherigen Einzelbrettern bevorzugt.
3. Innerhalb dieser Gruppe spielen die beiden punktniedrigsten Spieler.
4. Bei Punktgleichheit entscheidet die hoehere Startnummer.

### 5. Erste Runde separat paaren

In Runde 1 wird nicht nach Scoregroups gesucht, sondern nach Setzliste gepaart.

Normales Schweizer System: obere Haelfte gegen untere Haelfte.

Hand-and-Brain: Spieler werden paarweise aus der Setzliste zu virtuellen Einzelpaarungen gebildet.

### 6. Schweizer Scoregroups bilden

Ab Runde 2 werden Spieler nach Punktzahl gruppiert. Die Scoregroups werden von oben nach unten verarbeitet. Innerhalb einer Gruppe wird nach Punkten und Startnummer sortiert.

Wenn eine Gruppe eine ungerade Anzahl Spieler hat, wird ein Spieler als Floater in die naechste Gruppe weitergereicht.

### 7. Gegnerwiederholungen vermeiden

Innerhalb einer Scoregroup sucht die Logik zuerst nach einer vollstaendigen Paarung ohne Wiederholungsgegner.

Wenn das nicht klappt, darf sie mit Wiederholungen suchen. Solche Paarungen koennen `FALLBACK` oder spaeter `REPEAT` bekommen.

### 8. Paarungsqualitaet bewerten

Bei der Suche werden Kandidaten nach einer Kostenfunktion sortiert:

1. Wiederholung als sehr hoher Malus, wenn Wiederholungen erlaubt werden mussten.
2. Punktabstand als wichtiger Malus.
3. Startnummern als kleiner Stabilitaetsfaktor.

Das Ziel ist also zuerst: keine Wiederholung. Danach: moeglichst kleiner Punktabstand. Danach: stabile, erwartbare Reihenfolge.

### 9. Floater akzeptieren

Wenn eine Paarung Spieler aus unterschiedlichen Scoregroups verbindet, bekommt sie `FLOATER`. Das ist kein Fehler, sondern die sichtbare Markierung, dass die Scoregroup-Grenze aufgeloest werden musste.

### 10. Farben zuweisen

Erst nachdem die Gegner feststehen, werden Farben vergeben. Die Farblogik bevorzugt:

1. keine Farbdifferenz groesser als 2,
2. keine dritte gleiche Farbe in Folge,
3. moeglichst gute Gesamtbalance zwischen Weiss und Schwarz,
4. bei einer Wiederholungspaarung moeglichst nicht dieselbe Farbe gegen denselben Gegner.

Wenn keine gute Farbverteilung mehr moeglich ist, entstehen `FARBE`-Hinweise.

### 11. Hand-and-Brain-Bretter bauen

Im Hand-and-Brain-Modus wird der verbleibende Pool nach Bye und optionalem Einzelbrett nach Punkten absteigend und bei Gleichstand nach Startnummer aufsteigend sortiert. Danach entstehen die H&B-Bretter aus fortlaufenden Vierergruppen. Dadurch bleiben die Scoregroups zuerst zusammen: die oberen vier Spieler bilden ein Brett, danach die naechsten vier Spieler und so weiter.

Innerhalb jeder Vierergruppe werden die konkreten Teams, Farben und Brain/Hand-Rollen optimiert. Die Logik nimmt also die vier Spieler des Bretts als festen Rahmen, bewertet darin aber alle sinnvollen Team- und Rollenvarianten.

Die Varianten innerhalb eines H&B-Bretts bewerten:

1. gleiche Team-gegen-Team-Konstellation sehr schlecht,
2. direkte Duo-Wiederholungen aus der Vorrunde sehr schlecht,
3. Duo-Wiederholungen mit nur einer Runde Abstand deutlich schlecht,
4. Duo-Wiederholungen mit zwei Runden Abstand merklich schlecht,
5. aeltere Duo-Wiederholungen nur noch leicht schlecht,
6. Punktabstand zwischen den Seiten schlecht,
7. Farben und Rollentausch als nachrangige Qualitaetskriterien.

Fuer jedes H&B-Brett werden beide Farb-/Seitenrichtungen und beide Brain/Hand-Verteilungen ausprobiert. Erst danach wird die beste Variante innerhalb der Vierergruppe gewaehlt. Dadurch darf eine reine Farb- oder Rollenpraeferenz nicht mehr dazu fuehren, dass die Scoreblock-Zuordnung veraendert wird.

Bei der Brain/Hand-Verteilung wird die Rollenbalance bevorzugt und eine bereits identische Rollenverteilung innerhalb desselben Duos vermieden. Diese Rollenlogik ist aber zweitrangig gegenueber der Spielpartnerwahl: neue oder lange nicht wiederholte Duos sind wichtiger als eine perfekte Brain/Hand-Balance.

### 12. Paarungen validieren

Zum Schluss wird jede Paarung validiert. Dabei entstehen die sichtbaren Hinweise:

1. Bye-Probleme
2. fehlende, doppelte oder inaktive Spieler
3. Wiederholungspaarungen
4. Hand-and-Brain-Team-, Duo- und Rollenwiederholungen
5. zu grosser Punktabstand
6. Farbserie oder Farbungleichgewicht

### 13. Rundennummern und doppelte Spieler normalisieren

Ganz am Ende werden die Brettnummern neu gesetzt. Danach wird geprueft, ob ein Spieler mehrfach in derselben Runde vorkommt. Falls ja, kommt `DOPPELT` hinzu.

## Warum in spaeteren Runden mehr Hinweise auftauchen

Mit jeder gespielten Runde werden die Optionen enger:

1. Mehr Spieler haben schon gegeneinander gespielt.
2. Mehr Spieler haben bereits zwei gleiche Farben in Folge oder eine unausgeglichene Farbbilanz.
3. Scoregroups werden kleiner und ungerader, dadurch entstehen mehr Floater.
4. Byes koennen nicht immer an einen Spieler ohne vorheriges Bye gehen.
5. Im Hand-and-Brain-Modus zaehlen nicht nur Gegner, sondern auch Duos, Rollen und Team-gegen-Team-Konstellationen.

Darum ist die Zunahme der Hinweise ein erwartbares Signal: Die Logik findet weiterhin eine spielbare Runde, dokumentiert aber transparent, welche Ideale sie dafuer lockern musste.
