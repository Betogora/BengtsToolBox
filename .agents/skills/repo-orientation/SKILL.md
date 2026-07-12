---
name: repo-orientation
description: Orient Codex in BengtsToolBox with task-specific repository context. Use for implementation, review, debugging, documentation, architecture, planning, or status work in this repository before loading project specifications or roadmap material.
---

# Repository orientation for Codex

Always read `AGENTS.md` first. It is the compact repository guide and routes to the canonical sources below. Load only the sources and sections relevant to the task; do not read every canonical document in full by default.

## Route context

- **Product and behavior:** Inspect the headings of `docs/specs.md`, then read only the applicable product, global-requirement, persistence, app, development, operation, or security sections.
- **Architecture and structure:** Read the relevant parts of sections 6 and 7 of `docs/specs.md` when placing modules, changing interfaces or import rules, introducing shared code, or altering architecture.
- **Roadmap:** Read `docs/todo.md` only for scope, priority, status, or planning questions. Consult its completed/removed-work section only when checking earlier work or evidence.
- **Decisions:** Read section 6.4 of `docs/specs.md` and any applicable ADR or decision document when a task touches an existing or hard-to-reverse architecture decision. Do not assume a separate ADR directory exists; discover decision files first.
- **Public overview:** Read `README.md` only for repository overview, onboarding, or public-description work.
- **File names:** Read `docs/file-naming-conventions.md` only when creating or renaming files.

For broad cross-project changes, expand reading to every affected section and, only when necessary, complete documents. Treat current runtime code as the source of implementation detail. Use `docs/specs.html` as the rendered counterpart of `docs/specs.md`, not as a second source to load by default.
