# AGENTS.md — Image Style Studio (Root)

## Purpose

Image Style Studio ist eine native **Desktop-App** (Tauri 2, macOS/Windows/Linux) zum Entwickeln, Speichern und konsistenten Anwenden von Bildstilen für KI-Bildgenerierung (Bildmodelle über OpenRouter). Kern-Workflow: Stil im Playground finden → als Stil persistieren → in der Produktion nur noch das Motiv beschreiben.

## Ownership

- Gesamtes Repository; dieses Dokument ist das DOX-Rail für alle Subdomains.
- Stack: Tauri 2 (Rust-Backend) · React 19 SPA (Vite 8 + TanStack Router) · TypeScript 6 · TailwindCSS v4 · rusqlite/SQLite · reqwest → OpenRouter

## Local Contracts

### Kritische Implementierungsregeln (projektübergreifend)

1. **Backend-Aufrufe nur über `src/ipc/*`** — Komponenten/Routen importieren nie `invoke` direkt. Jede Backend-Funktion existiert als Tauri-Command (Rust) + IPC-Adapter (TS) mit derselben Signatur wie die frühere Server Function (`fn({ data })`-Konvention).

2. **DTO-Kontrakt beidseitig pflegen** — Rust-DTOs (`src-tauri/src/dto.rs`, serde camelCase, Dates als ISO-Strings) spiegeln `src/lib/types.ts`. Shape-Änderungen immer synchron auf beiden Seiten.

3. **Prompt-/Hash-Parität Rust ↔ TS** — `src-tauri/src/prompt.rs` ↔ `src/lib/prompt/compile.ts` und `src-tauri/src/canonical.rs` ↔ `src/lib/canonicalJson.ts` müssen identischen Output liefern (Key-Reihenfolge inklusive; Rust nutzt serde_json `preserve_order`). Tests auf beiden Seiten.

4. **SQLite kennt keine Scalar-Arrays** — Arrays/Objekte (`tags`, `anchorImageIds`, `styleJson`, `params`, `compiledPrompt`) liegen als JSON-Strings in TEXT-Spalten. Schema und Spaltennamen sind 1:1 kompatibel zum früheren Prisma-Schema (migrierte `dev.db` läuft unverändert).

### Import-Alias

`#/*` → `./src/*` (definiert in `package.json` `imports` + `tsconfig.json`). Immer `#/` statt relativer Pfade.

### Routenbaum

`src/routeTree.gen.ts` wird von TanStack Router automatisch generiert — **nie manuell bearbeiten**. Neue Routen nur als Dateien in `src/routes/` anlegen.

## Work Guidance

- Neue Backend-Features: Tauri-Command in `src-tauri/src/commands/` + Registrierung in `src-tauri/src/lib.rs` + IPC-Adapter in `src/ipc/`.
- Provider-Scope ist bewusst **nur OpenRouter** (`src-tauri/src/provider.rs`); Gemini-/OpenAI-Direktprovider später als weitere Module nach gleichem Muster. Legacy-`provider: "gemini"`-Werte werden in `resolve_model()` gemappt.
- Foto-Schemaänderungen in `src/lib/schema/photoStyle.ts` starten; Formular-Rendering folgt automatisch via `src/lib/schema/fields.ts`. Andere Bildarten in `src/lib/kinds/` (eigenes AGENTS.md).
- DB-Schemaänderungen in `src-tauri/src/db.rs` (`migrate()`, idempotent via `IF NOT EXISTS`); bei neuen Spalten an Alt-Datenbank-Kompatibilität denken (`ALTER TABLE`-Pfad ergänzen).
- Code-Signing ist bewusst nicht konfiguriert (Entscheidung 2026-06-11); Auto-Update läuft über das Updater-Keypair (CI-Secrets `TAURI_SIGNING_PRIVATE_KEY*`).

## Verification

```bash
npm test                                  # Vitest unit tests (Frontend)
npm run lint                              # ESLint
npm run build                             # Frontend-Build (SPA)
npx tsc --noEmit                          # Typecheck
cargo test --manifest-path src-tauri/Cargo.toml   # Rust-Tests
npm run dev:desktop                       # End-to-End im Dev-Modus
```

## Child DOX Index

- [`src/routes/AGENTS.md`](src/routes/AGENTS.md) — Dateibasiertes Routing, Route-Konventionen
- [`src/components/AGENTS.md`](src/components/AGENTS.md) — React-UI-Komponenten
- [`src/ipc/AGENTS.md`](src/ipc/AGENTS.md) — IPC-Adapter (Frontend ↔ Rust-Backend)
- [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — Shared Library: Schema, Prompt, Utility
- [`src/lib/kinds/AGENTS.md`](src/lib/kinds/AGENTS.md) — Bildart-Registry (foto, illustration, infografik)
- [`src/lib/providers/AGENTS.md`](src/lib/providers/AGENTS.md) — Provider-Typen (nur noch Typdefinitionen fürs Frontend)
- [`src/lib/schema/AGENTS.md`](src/lib/schema/AGENTS.md) — Zod-Fotostil-Schema (Single Source of Truth für Foto)
- [`src-tauri/AGENTS.md`](src-tauri/AGENTS.md) — Rust-Backend: Commands, Provider, DB, Storage
