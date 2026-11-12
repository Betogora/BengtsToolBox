---
name: audit-last-change
description: Prüft auf Wunsch den fertigen Diff vor Commit oder Push auf Fehler, sichere Vereinfachungen und belegbare Performance-Verbesserungen.
---

# Audit Last Change

Lass zuerst einen frischen Subagenten mit demselben Modell und derselben Reasoning-Stufe wie dieser Thread (sofern nicht anders genannt) den Diff nur lesend auf Fehler prüfen: Fälle aus dem echten Gebrauch (leere oder alte gespeicherte Daten, Abbruch, Gleichzeitigkeit, Fehlerpfade) und Verstöße gegen AGENTS.md. Er meldet nur Befunde mit Datei, Zeile und konkretem Fehlerszenario, sonst „keine Befunde“. Bei kleinem Diff prüfst du das selbst. Arbeite währenddessen weiter, bestätige danach jeden Befund am Code und behebe ihn, wenn der Fix klein und das gewollte Verhalten eindeutig ist; sonst melde ihn.

Prüfe den zuletzt umgesetzten Diff und direkt betroffene Codepfade auf redundanten Code, unnötige Abstraktionen, doppelte Zustände und vermeidbare Arbeit in häufigen Pfaden.

Setze nur klar belegbare Verbesserungen mit kleinem Diff um. Features, beobachtbares Verhalten, UI, externe Verträge, Persistenz, Typsicherheit und sinnvolle Testabdeckung bleiben erhalten. Keine angrenzenden Refactorings oder spekulativen Micro-Optimierungen.

Prüfe auch neue oder geänderte Tests: Sichern sie ein benanntes Risiko gegen echten Produktionscode ab? Tests, die Logik nachbauen, nur Texte oder entfernte Features prüfen oder vorhandene Fälle duplizieren, werden vereinfacht oder entfernt; projektspezifische Testregeln haben Vorrang.

Begründe Performance-Änderungen durch Messwerte oder einen nachvollziehbaren Kostenpfad. Bei unklarem Nutzen bleibt der bestehende Code bestehen. Prüfe die betroffenen Verträge mit fokussierten Tests und den dafür geltenden Projektchecks.

Berichte knapp gefundene Fehler, die Änderungen, ihren Nutzen, betroffene Dateien und Prüfungen; melde auch ausdrücklich, wenn weder Fehler noch sinnvolle Vereinfachung gefunden wurden.
