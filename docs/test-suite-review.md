# Testsuite Prüfung und Messvergleich

Stand: 2. Oktober 2026. Die vorhandene Suite wurde über alle Apps, gemeinsame Infrastruktur, Build-/Dokumentationsskripte, Browserfälle und Firebase-Regeltests geprüft. Zusammengeführt wurden doppelte Szenarien; die größten Einsparungen entstehen durch weniger wiederholte Browserabläufe und Vitest-Workerthreads. Produktionslogik und Abhängigkeiten wurden für diesen Auftrag nicht geändert.

## Umfang und Zählweise

Ausgangscommit: `5c93d48305bab763410329db7ae540ff80b356b4`, zunächst sauberer Arbeitsbaum. Während der Prüfung liefen parallel Änderungen am Live-Buzzer einschließlich neuer Tests und Änderungen an gemeinsamen Spezifikationsdateien. Diese Änderungen bleiben erhalten und sind nicht der Optimierung zugerechnet.

Die folgenden Bestandszahlen vergleichen die ursprünglich vorhandenen Dateien mit ausschließlich den Änderungen dieses Auftrags. „Zeilen“ zählt physische Textzeilen einschließlich Kommentaren und Leerzeilen, ohne abschließende Leerzeilen; „nichtleer“ entfernt nur leere Zeilen. Das ist keine AST-basierte Zählung ausführbarer Anweisungen. Parametrisierte Fälle werden nach der tatsächlichen Testausführung gezählt.

| Messgröße im geprüften Bestand | Vorher | Nachher | Änderung |
| --- | ---: | ---: | ---: |
| Vitest-Testdateien | 38 | 38 | 0 |
| Vitest-Testfälle | 258 | 254 | −4 |
| Browser-Szenarien in vier Dateien | 23 | 21 | −2 |
| Geplante Browserläufe | 92 | 59 | −33 / −35,9 % |
| Tatsächlich ausgeführte Browserprüfungen | 89 | 59 | −30 / −33,7 % |
| Übersprungene Browserläufe | 3 | 0 | −3 |
| Firebase-Testdateien | 1 | 1 | 0 |
| Alle Testdateien | 43 | 43 | 0 |
| Vitest-Zeilen | 5.438 | 5.328 | −110 |
| Browser-Zeilen | 1.591 | 1.430 | −161 |
| Firebase-Zeilen | 330 | 330 | 0 |
| Alle Testzeilen | 7.359 | 7.088 | −271 / −3,7 % |
| Nichtleere Testzeilen | 6.567 | 6.311 | −256 / −3,9 % |
| Vorhandene Hilfen und Runner-Konfigurationen, Zeilen | 357 | 362 | +5 |
| Neue Testdateien / entfernte Testdateien | — | 0 / 0 | 0 |
| Neue Abhängigkeiten | — | 0 | 0 |

Im nachgemessenen gesamten Arbeitsbaum bestanden 263 Vitest-Fälle in 39 Dateien: 258 ursprünglich, minus vier zusammengeführte Fälle, plus neun parallel ergänzte Fälle. Die Laufzeitmessung umfasst diese größere Suite. Die kontrollierte Browsermessung beschränkt sich auf die vier bereits vorher vorhandenen Dateien, damit neu hinzugekommene Live-Buzzer-Browserfälle den Vergleich nicht verzerren.

## Laufzeit und Messbedingungen

Windows, Intel Core Ultra 5 226V, acht logische Prozessoren, Node `24.15.0`, npm `11.12.1`, Vitest `4.1.10`, Vite `8.1.4`, Playwright `1.61.1`, Chromium `149.0.7827.55` / Revision `1228`. Die installierte Vite-Version ist hier maßgeblich, nicht allein der Versionsbereich in `package.json`.

Vitest: ein ungewerteter Warmup, danach drei eigenständige `npm test`-Prozesse mit JSON-Reporter und unveränderter automatischer Workerzahl. Vorher isolierte Prozesse (`forks`), nachher isolierte Workerthreads (`threads`). Gemessen wird die PowerShell-Stopwatch um den gesamten npm-Aufruf, einschließlich Start und Berichtsausgabe.

Browser: jeweils ein erfolgreicher vollständiger Lauf mit zwei Workern, denselben vier Viewports, JSON-Reporter, ohne Retries und ohne Coverage. Beide Vergleichsläufe starten Vite auf Port `5180` mit `server.watch: null` und `server.hmr: false`, damit parallele Quelldateiänderungen keine Testseite neu laden. Diese Einstellungen liegen nur in ignorierten temporären Konfigurationen unter `logs/`. Während dieser Browsermessungen liefen keine weiteren Checks dieses Auftrags.

| Laufzeit | Vorher | Nachher | Änderung |
| --- | ---: | ---: | ---: |
| Vitest Lauf 1 | 6,818 s | 4,016 s | −2,802 s |
| Vitest Lauf 2 | 8,521 s | 4,785 s | −3,736 s |
| Vitest Lauf 3 | 9,086 s | 4,149 s | −4,937 s |
| Vitest Median | 8,521 s | 4,149 s | −4,372 s / −51,3 % |
| Vitest Minimum bis Maximum | 6,818–9,086 s | 4,016–4,785 s | geringere Streuung in dieser Stichprobe |
| Browser, gesamter npm-Aufruf | 217,499 s | 171,198 s | −46,301 s / −21,3 % |

Die Zahlen sind lokale Diagnosewerte, kein zugesagtes CI-Zeitbudget. Die drei Vitest-Läufe rechtfertigen keine belastbare p95-Aussage; bei Browsern wurde je Stand nur ein erfolgreicher Vergleichslauf gemessen. Gleichzeitig laufende fremde Arbeit kann die Systemlast beeinflussen. Der Nachher-Vitest-Stand enthält zusätzliche fremde Tests und geänderte Live-Buzzer-Imports; die Messung isoliert daher nicht den alleinigen Effekt der Runner-Option.

Zwei frühere Browser-Ausgangsläufe mit normalem Dateiwatcher scheiterten sporadisch im Triathlon-Tracker, nach 297,907 beziehungsweise 296,071 Sekunden. Die zwei Fehler des ersten Laufs bestanden anschließend ohne Teständerung gezielt in 32 Sekunden. Die späteren erfolgreichen Messungen ohne Watcher sind mit einer Störung durch parallele Entwicklung vereinbar, beweisen aber deren Ursache nicht. Diese fehlgeschlagenen Läufe fließen nicht in die Einsparungsrechnung ein. Ein Nachherstart scheiterte vor der Testausführung am zwischenzeitlich belegten Port `5180` und zählt ebenfalls nicht als Messlauf.

## Zusammenführung und erhaltene Abdeckung

| Bereich | Änderung | Erhaltene Aussage |
| --- | --- | --- |
| Turnierkorrektur | Doppelten Domain-Fall in den Lebenszyklustest aufgenommen | Bestätigung, tatsächlicher Retry, Regenerierungseffekt, korrigiertes Ergebnis, erhaltene manuelle Paarung |
| Turnierreset | Lebenszyklus- und Firestore-Serialisierungsfall vereinigt | Gespielte und offene Runden entfernen, Status und Metadaten zurücksetzen, serialisierbarer neuer Zustand |
| Mario Kart | Zwei Abschluss-/Platzierungsfälle vereint | Doppelte Plätze und Platz 25 verhindern Abschluss; Platz 24, relative Punkte, Durchschnitt, Fortschritt und Wertungsrennen |
| Sushi Map | Konkrete 14-Ereignis-Reparaturfixture durch kleinen Migrations- und Claim-Fall ersetzt | England-Zuordnung, unveränderte Metadaten, Personen und Claims beider Karten; separate Idempotenz |
| Fortschritts-Dashboard | Separaten Standardnamen-Farbfall in responsiven Dashboardfall aufgenommen | Gespeicherte Farbe bei Standardnamen, Verläufe, Reihenfolge und Layout |
| Überholte UI | Abwesenheitschecks früherer Tabs und Farbpicker-Texte/-Buttons entfernt | Sliderbedienung, sichtbare Farbänderung, direkte Speicherung und Escape-Verhalten bleiben |
| Triathlon-Vorschau | Screenshot-Erzeugung mit bereits anderweitig geprüften Abläufen entfernt | Modelle, Statistik, Kalender und Paceformular bleiben in bestehenden Tests abgesichert |
| Browsermatrix | Acht größenunabhängige Fälle mit `@desktop`, Panning mit `@touch` | Jeder Fall weiterhin mindestens einmal; responsive Abläufe weiterhin viermal |
| Vitest-Runner | `pool: 'threads'` | Dateiisolation, Node-Umgebung und bestehende Mock-Grenzen bleiben erhalten |

Löschtests wurden nicht pauschal gestrichen: Entfernen von Teilnehmern oder Trainings ist laufendes Verhalten. Schutz vor Wiederanlage parallel gelöschter Daten, erlaubte beziehungsweise verbotene Löschaktionen und Firestore-Regeln können durch spätere Codeänderungen regressieren. Es gab im Ausgangsbestand keine eigenen Tests, die nur das Fehlen gelöschter Quellcode-Dateien prüften. Migrationen gespeicherter Altstände bleiben erhalten, solange diese Daten vorkommen können.

Die übrigen Cases für Coinflip, Randomizer, Glücksrad, Fragenkatalog, Scoreboard, Schlag den Raab, Triathlon-Fachlogik, historische Namen, Registry, Lobby-Pfade, Storage, optimistische Mutationen, Batch-Rollback und Sicherheitsgrenzen decken unterschiedliche beobachtbare Verträge ab. Für diese Bereiche ergab die Prüfung keinen ausreichend begründeten Wegfall. Gleiche Fachbegriffe in Unit-, Hook-, Browser- und Emulatortests bedeuten nicht automatisch dieselbe Abdeckung.

## Änderungen nach Dateien

| Testdatei oder Runner | Hinzugefügte Zeilen | Entfernte Zeilen | Netto |
| --- | ---: | ---: | ---: |
| `src/apps/swiss-tournaments/domain/tournamentDomain.test.ts` | 24 | 42 | −18 |
| `src/apps/swiss-tournaments/logic.lifecycle.test.ts` | 10 | 34 | −24 |
| `src/apps/swiss-tournaments/logic.mario-kart.test.ts` | 9 | 32 | −23 |
| `src/apps/territory-map/hooks/useTerritoryMap.test.ts` | 19 | 64 | −45 |
| `tests/browser/browser-smoke.spec.ts` | 9 | 24 | −15 |
| `tests/browser/sync-errors.spec.ts` | 4 | 4 | 0 |
| `tests/browser/triathlon-tracker.spec.ts` | 2 | 148 | −146 |
| `vite.config.ts` | 1 | 0 | +1 |
| `playwright.config.ts` | 4 | 0 | +4 |
| Tests und Runner gesamt | 82 | 348 | −266 |

Der dauerhafte Agentenkontext steht in [AGENTS.md](../AGENTS.md#tests-gezielt-pflegen) und [Abschnitt 7.4 der Spezifikation](specs.md#74-testsystem), einschließlich der HTML-Lesefassung. Dieser Bericht ist die einzige für diesen Auftrag neu angelegte Datei außerhalb ignorierter Messartefakte. Gemeinsame Spezifikationsdateien enthalten zusätzlich parallele Änderungen; deren vollständiger Git-Diff darf nicht diesem Auftrag zugerechnet werden.

| Dokumentation und Gesamtdiff dieses Auftrags | Hinzugefügt | Entfernt | Netto |
| --- | ---: | ---: | ---: |
| `AGENTS.md` | 7 | 0 | +7 |
| `docs/specs.md`, nur Testabschnitt | 9 | 1 | +8 |
| `docs/specs.html`, nur Testabschnitt und Fingerprint | 9 | 2 | +7 |
| `docs/test-suite-review.md`, neuer Bericht | 116 | 0 | +116 |
| Alle 13 betroffenen Dateien | 223 | 351 | -128 |

Damit wird die Suite um 271 Testzeilen reduziert; fünf zusätzliche Runner-Zeilen steuern die schnellere Ausführung. Die Dokumentationszunahme hält die Messwerte und Regeln für zukünftige Agenten fest. Keine Produktionsdatei wurde für die Optimierung bearbeitet.

## Verifikation und verbleibende Grenzen

| Prüfung | Ergebnis |
| --- | --- |
| Fokussierte Vitest-Prüfung der vier geänderten Dateien | 55 Fälle bestanden |
| `npm test`, gesamte aktuelle Suite | 263 Fälle in 39 Dateien; alle drei Nachhermessungen bestanden |
| Browser, vier ursprüngliche Dateien | 59 Läufe bestanden, keine übersprungen |
| Browser, parallel ergänzter Live-Buzzer | Weitere 9 Läufe bestanden; außerhalb des Performancevergleichs |
| `npm run test:firebase` | 13 Fälle bestanden, einschließlich zwei parallel ergänzter Fälle |
| `npm run lint` und fokussiertes ESLint | Bestanden |
| `npm run docs:check` | Links und Specs-Fingerprint bestanden |
| `npm run build` | TypeScript, Vite und Bundle-Budgets bestanden |
| `git diff --check` | Bestanden für den eigenen Änderungssatz |

Frühere Versuche trafen zwei inzwischen behobene Lintfehler im parallel bearbeiteten Live-Buzzer, belegte Emulatorports und einen während der Browserprüfung verschwindenden fremden Dev-Server. Diese Fehlversuche wurden separat behandelt. Die abschließenden Browserprüfungen starteten ihren eigenen lokalen Server auf Port `5180`, ohne vorhandene Server zu beenden.

Nicht aufgenommen wurden neue Testframeworks, ein Coverage-Gate, deaktivierte Isolation, höhere Retries/Timeouts, Produktionsrefactorings oder Änderungen an den Hosting-Workflows. Coverage-Prozentwerte wurden nicht vorher/nachher erhoben: Die bestehende Coverage-Auswahl umfasst nur sieben Module und würde keine app-weite Abdeckungsgleichheit belegen. Die Prüfstrategie für künftige Ergänzungen bleibt verhaltensbezogen.

Die verwendeten Runner-Möglichkeiten sind in der offiziellen [Vitest-Performance-Dokumentation](https://vitest.dev/guide/improving-performance#pool) und bei [Playwright-Projektfiltern](https://playwright.dev/docs/api/class-testproject#test-project-grep-invert) beschrieben. Rohmessungen liegen unversioniert unter `logs/`; zum Wiederholen ohne Parallelentwicklung genügen JSON-Reporter, dieselbe Workerzahl und die oben beschriebenen Warmup-/Messläufe.
