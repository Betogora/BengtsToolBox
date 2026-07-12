# Dateinamenskonventionen

Diese Konvention gilt für neue und umbenannte Dateien in diesem Repository. Maßgeblich ist zuerst der vom jeweiligen Werkzeug erwartete Name, danach die Rolle der Datei und erst danach die allgemeine Schreibweise. Bestehende Pfade werden nicht allein zur Vereinheitlichung rückwirkend umbenannt.

## Priorität

1. Werkzeuggebundene Namen und Pfade bleiben exakt erhalten, zum Beispiel `package.json`, `vite.config.ts`, `vercel.json`, `supabase/config.toml` und `.github/workflows/ci.yml`.
2. Reservierte Projektdokumente verwenden ihren etablierten Namen, zum Beispiel `README.md`, `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `STRUCTURE.md` und `ROADMAP.md`.
3. Frei benennbare Dateien folgen der rollenbezogenen Konvention.
4. Dateinamen bleiben aus Gründen der Portabilität ASCII-basiert. Deutsche Inhalte dürfen und sollen dagegen korrekt geschrieben werden.

## Rollenbezogene Konvention

| Rolle | Muster | Beispiele |
| --- | --- | --- |
| Einzelne React-Komponente oder Screen | `PascalCase.tsx` | `PlannerScreen.tsx`, `RecipeCard.tsx` |
| TSX-Sammlung oder UI-Helfermodul | `camelCase.tsx` | `components.tsx`, `ui.tsx` |
| TypeScript-Modul | `camelCase.ts` | `planService.ts`, `cloudRepository.ts` |
| TypeScript-Einstieg oder Barrel | etablierter Rollenname | `main.tsx`, `index.ts` |
| Zugeordneter Modultest | `<modul>.test.ts` | `planService.test.ts` |
| Szenario-, Integrations- oder Smoke-Test | `kebab-case.test.ts` oder `kebab-case.spec.ts` | `ownership-smoke.test.ts`, `auth-gate.spec.ts` |
| Test-Setup | `<rolle>.setup.ts` | `auth.setup.ts` |
| JavaScript-Modul | `camelCase.js` | `coreModel.js`, `cloudRepository.js` |
| Einzelne React-Komponente in JavaScript | `PascalCase.jsx` | `DashboardScreen.jsx` |
| JSX-Sammlung oder UI-Helfermodul | `camelCase.jsx` | `coreUi.jsx`, `cardMedia.jsx` |
| JavaScript-Skript | `camelCase.mjs` | `runLocalE2E.mjs` |
| Python-Modul oder -Skript | `snake_case.py` | `create_world_capitals_apkg.py` |
| Freies Markdown-Dokument | `kebab-case.md` | `file-naming-conventions.md` |
| Reserviertes Markdown-Dokument | offizieller Name | `README.md`, `AGENTS.md` |
| Generierte HTML-Fassung | Basisname der Quelle | `specs.md`, `specs.html` |
| Eigenständige HTML-Datei | `kebab-case.html` | `todo-review.html` |
| JSON-Fixture | `kebab-case[.rolle].json` | `world-capitals.source.json` |
| Sonstige Fixture | beschreibendes `kebab-case.ext` | `plain-text-sample.txt`, `pdf-selection.pdf` |
| Freies SQL-Skript | `snake_case.sql` | `core_schema_v1.sql`, `verify_schema_v1.sql` |
| Supabase-Migration | `<timestamp>_<beschreibung>.sql` | `20260709091315_sync_media_auth_operations.sql` |
| Supabase-E-Mail-Template | referenzierter `snake_case.html`-Pfad | `magic_link.html`, `reset_password.html` |
| Freie YAML-Datei | `kebab-case.yaml` | `deployment-preview.yaml` |
| Werkzeuggebundene YAML-Datei | Werkzeugkonvention | `.github/workflows/ci.yml` |
| Asset | beschreibendes `kebab-case.ext` oder etablierter Webname | `nutrition-hero.svg`, `favicon.svg` |

## Entscheidungsregeln

- Der Dateiname einer einzelnen React-Komponente entspricht ihrem exportierten Hauptsymbol. Dateien mit mehreren gleichrangigen UI-Exports dürfen als `camelCase.tsx` beziehungsweise `camelCase.jsx` benannt sein.
- Fachliche TypeScript- und JavaScript-Module verwenden `camelCase`, passend zu den importierten Symbolen und zur bestehenden ESM-Codebasis.
- `*.test.*` bezeichnet Modul-, Integrations- und Smoke-Tests. Browserbasierte Playwright-Szenarien verwenden `*.spec.*`.
- Zusätze wie `.source`, `.expected` oder `.snapshot` stehen bei Datenartefakten direkt vor der eigentlichen Endung.
- Supabase-Migrationen werden mit `supabase migration new <name>` erzeugt. Bereits angewendete Migrationen werden nicht nachträglich umbenannt.
- Supabase-Template-Dateien dürfen nur zusammen mit allen `content_path`-Referenzen umbenannt werden. Ohne fachlichen Grund bleiben bestehende Pfade stabil.
- Generierte Katalog- und Reportdateien folgen vorrangig dem Namen, den ihr Generator und dessen Konsumenten vertraglich erwarten. Eine Umbenennung umfasst immer Generator, Referenzen und Checks.
- Versionsstände gehören grundsätzlich in Git oder in den Dokumentinhalt. Ausnahmen sind bewusst versionierte technische oder Daten-Anker.
- Zu vermeiden sind Leerzeichen, Umlaute, beliebige Groß-/Kleinschreibung, unklare Namen wie `testdatei.txt` und Statusketten wie `final-neu-v2.md`.
