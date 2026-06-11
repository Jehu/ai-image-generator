# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## README aktuell halten

**Pflicht bei jedem neuen Feature oder jeder signifikanten Änderung:** `README.md` im selben
Arbeitsschritt mit aktualisieren — nicht als separaten späteren Task. Signifikant heißt: neue
Bildart/Provider/Modell, neue nutzersichtbare Funktion, geänderter Setup-/Env-Schritt, geänderter
Workflow oder umgestellte Architektur-Bausteine.

Konkret zu prüfende README-Stellen: Intro, „Was du damit machen kannst", Setup-Block (inkl.
`.env`-Variablen), Scripts-Tabelle und der Architektur-Abschnitt. Verschweigt die README ein
Feature, das im Code existiert, gilt die Aufgabe als unfertig. Diese Regel ergänzt den DOX-Pass
für `AGENTS.md` (unten) — beide Dokument-Ebenen aktuell halten.

## Commands

```bash
npm run dev:desktop   # Desktop-App im Dev-Modus (Vite + Tauri, Hot-Reload)
npm run build:desktop # Desktop-Bundles bauen (dmg/msi/AppImage/…)
npm run dev           # Nur Frontend im Browser (Backend-Aufrufe schlagen fehl)
npm run build         # Frontend-Produktions-Build (dist/)
npm test              # Frontend-Unit-Tests (Vitest)
npm run generate-routes  # Route-Tree manuell neu generieren (läuft auch im Dev automatisch)
npm run lint          # ESLint
npm run format        # Prettier + ESLint --fix
cargo test --manifest-path src-tauri/Cargo.toml   # Rust-Unit-Tests
```

Shadcn-Komponenten hinzufügen:
```bash
pnpm dlx shadcn@latest add <component>
```

## Architektur

**Tauri 2 Desktop-App**: React 19 SPA (Vite 8 + TanStack Router) in der System-WebView, komplettes Backend in Rust (`src-tauri/`). Kein Node zur Laufzeit, kein SSR. TypeScript 6, TailwindCSS v4, rusqlite/SQLite, reqwest → OpenRouter.

### Routing und IPC

Dateibasiertes Routing in `src/routes/`. Die Datei `src/routeTree.gen.ts` wird **automatisch generiert** — nie manuell bearbeiten. Neue Routen als Dateien in `src/routes/` anlegen, Namenskonvention: `segment.$param.tsx` oder `segment.index.tsx`.

Backend-Logik liegt in **Tauri-Commands** (`src-tauri/src/commands/`). Das Frontend ruft sie ausschließlich über die **IPC-Adapter** in `src/ipc/` auf — dünne Wrapper mit denselben Signaturen wie die früheren Server Functions (`fn({ data })`-Konvention, Command-Arg heißt `input`). API-Keys leben nur im Rust-Backend.

### Kritische Implementierungsregeln

1. **Backend-Aufrufe nur über `src/ipc/*`** — nie `invoke` direkt in Routen/Komponenten. Neue Backend-Funktion = Rust-Command (`commands/` + Registrierung in `lib.rs`) + IPC-Adapter.

2. **DTO-Kontrakt beidseitig** — `src-tauri/src/dto.rs` (serde camelCase, ISO-Dates) spiegelt `src/lib/types.ts`. Shape-Änderungen immer synchron.

3. **Prompt-/Hash-Parität Rust ↔ TS** — `prompt.rs` ↔ `compile.ts`, `canonical.rs` ↔ `canonicalJson.ts`: byte-identischer Output (serde_json `preserve_order` nicht entfernen). Sonst brechen `briefSourceHash` und Prompt-Reproduzierbarkeit.

4. **SQLite hat keine Scalar-Arrays** — Arrays/Objekte (tags, anchorImageIds, styleJson, params) liegen als JSON-Strings in TEXT-Spalten; Schema ist 1:1 Prisma-kompatibel (migrierte `dev.db` läuft unverändert).

5. **rusqlite ist synchron** — DB-Guard nie über ein `.await` halten (erst lesen, droppen, dann HTTP, dann neu locken).

### Datenfluss (Kern-Feature)

```
Playground (src/routes/index.tsx)
  → StyleEditor (JSON-Block) + subject (Textarea)
  → generateImage (src/ipc/generate.ts) → invoke('generate_image')
      → commands/generate.rs: Stil-Anker aus DB laden (wenn styleId gesetzt)
      → prompt.rs::compile_prompt() → JSON-Prompt-Text
      → provider.rs::generate() → OpenRouter Chat-Completions (modalities image+text)
  → ResultGrid zeigt Bilder als data-URLs
```

### Provider (nur OpenRouter)

`src-tauri/src/provider.rs`: kuratierte Modellliste (`OPENROUTER_MODELS`), Generierung, Pricing-Cache (6 h). Stil-Analyse (Vision) und Style-Briefs laufen über `src-tauri/src/llm.rs`, ebenfalls OpenRouter (Default `google/gemini-2.5-flash`). Legacy-Stile mit `provider: "gemini"` mappt `resolve_model()` transparent. `src/lib/providers/types.ts` enthält nur noch die Frontend-Typen.

### Stil-Schema (Single Source of Truth)

`src/lib/schema/photoStyle.ts` — Zod-Schema (`looseObject` → unbekannte Keys bleiben erhalten für JSON-Escape-Hatch). Das Schema treibt:
- Formular-Rendering im `StyleEditor`
- Validierung beim Speichern und nach der Stil-Analyse (clientseitig in `src/ipc/analyze.ts`)
- Typen im gesamten Frontend

### Storage

`src-tauri/src/storage.rs` speichert Bilder als Dateien im App-Data-Verzeichnis (`data/images/`, via `IMAGE_DIR` überschreibbar); in der DB steht der relative Pfad. Auslieferung an die UI als data-URLs.

### Konsistenz-Mechanismus (Stil-Anker)

Die Bildmodelle unterstützen keine Seeds. Konsistenz (~80–95 %) wird über **Anker-Bilder** erreicht: ein gespeicherter Stil kann bis zu 11 Referenzbilder pinnen (`anchorImageIds`). Diese werden bei jeder Produktion als `image_url`-Parts vor dem Prompt-Text mitgeschickt. Ohne Anker: ~50–65 % Konsistenz.

### Datenmodell (SQLite, Prisma-kompatibel)

- `Style` — gespeicherter Stil mit `styleJson`, `defaultParams`, `anchorImageIds`
- `StyleVersion` — Versionsverlauf (wird beim Update angelegt)
- `Generation` — jede API-Anfrage, verknüpft mit Stil und Output-Images
- `Image` — Bild-Metadaten; `kind` ist `output | anchor | upload | reference`
- `CameraBody` — Kamera-Presets für den StyleEditor

Schema in `src-tauri/src/db.rs` (`migrate()`, idempotent). Beim ersten Start übernimmt `legacy_migrate.rs` eine vorhandene Web-App-DB (`prisma/data/dev.db` + `data/images`, auch via `LEGACY_DATA_DIR`).

### Import-Alias

`#/*` → `./src/*` (in `package.json` `imports` und `tsconfig.json` konfiguriert). Immer `#/` statt relativer Pfade verwenden.

## Umgebungsvariablen

Siehe `.env.example`. Pflichtfeld: `OPENROUTER_API_KEY` (https://openrouter.ai/keys) — im Dev-Modus via `.env`, in der installierten App via Env oder `config.json` im App-Data-Verzeichnis. Nach Änderungen Dev-Modus neu starten.

## Releases

`v*`-Tag pushen → `.github/workflows/desktop-build.yml` baut macOS/Windows/Linux-Bundles als Release-Draft. **Kein OS-Code-Signing** (Entscheidung 2026-06-11). Auto-Update über Tauri-Updater (Keypair: Public Key in `tauri.conf.json`, privater Schlüssel `~/.tauri/image-style-studio.key` bzw. CI-Secret `TAURI_SIGNING_PRIVATE_KEY`).

# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Child DOX Index

- [`AGENTS.md`](AGENTS.md) — Root DOX-Rail: kritische Regeln, Projektübersicht, vollständiger Child-Index
  - [`src/routes/AGENTS.md`](src/routes/AGENTS.md) — Dateibasiertes Routing
  - [`src/components/AGENTS.md`](src/components/AGENTS.md) — React-UI-Komponenten
  - [`src/ipc/AGENTS.md`](src/ipc/AGENTS.md) — IPC-Adapter (Frontend ↔ Rust-Backend)
  - [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — Shared Library
    - [`src/lib/providers/AGENTS.md`](src/lib/providers/AGENTS.md) — Provider-Typen (Frontend)
    - [`src/lib/schema/AGENTS.md`](src/lib/schema/AGENTS.md) — Zod-Schema (Single Source of Truth)
  - [`src-tauri/AGENTS.md`](src-tauri/AGENTS.md) — Rust-Backend: Commands, Provider, DB, Storage