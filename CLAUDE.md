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
npm run dev           # Dev-Server auf http://localhost:3000
npm run build         # Produktions-Build
npm test              # Unit-Tests (Vitest, ohne Browser)
npm run test:gen      # Einmaliger End-to-End-Gemini-Test (kostet API-Credits)
npm run db:push       # SQLite-Schema anlegen/synchronisieren (nach Schema-Änderungen)
npm run db:migrate    # Migration erstellen (für Produktions-Szenarien)
npm run db:studio     # Prisma Studio öffnen
npm run db:seed       # Seed-Daten laden
npm run generate-routes  # Route-Tree manuell neu generieren (läuft auch im Dev automatisch)
npm run lint          # ESLint
npm run format        # Prettier + ESLint --fix
```

Shadcn-Komponenten hinzufügen:
```bash
pnpm dlx shadcn@latest add <component>
```

## Architektur

**TanStack Start** (Vite 8 + TanStack Router) als Full-Stack-Framework. Der Dev-Server läuft mit Nitro als Server-Runtime. React 19, TypeScript 6, TailwindCSS v4.

### Routing und Server Functions

Dateibasiertes Routing in `src/routes/`. Die Datei `src/routeTree.gen.ts` wird **automatisch generiert** — nie manuell bearbeiten. Neue Routen als Dateien in `src/routes/` anlegen, Namenskonvention: `segment.$param.tsx` oder `segment.index.tsx`.

Server-seitige Logik wird über **TanStack Start Server Functions** (`createServerFn`) in `src/server/` gebündelt. Der API-Key und Prisma laufen nur im Server-Kontext.

### Kritische Implementierungsregeln

1. **Prisma und Storage nur dynamisch importieren** — niemals statischer Top-Level-Import von `#/db` oder `#/lib/storage`. Nur innerhalb von Server-Function-Handlern per `await import('#/db')`. Statische Imports leaken Node-Code (`fileURLToPath`) ins Client-Bundle und crashen im Browser.

2. **Server-Function-Rückgaben müssen serialisierbar sein** — keine `Date`-Objekte, keine Prisma-Modell-Typen direkt. Stattdessen DTOs aus `src/lib/types.ts` (`StyleDTO`, `GenerationDTO` etc.) verwenden oder Dates als ISO-Strings serialisieren.

3. **SQLite hat keine Scalar-Arrays** — Arrays und strukturierte Objekte (tags, anchorImageIds, styleJson, params) liegen als `Json`-Spalten in Prisma und werden als `unknown`/`JsonObject` behandelt. Für Queries immer casten: `(value as string[])`.

### Datenfluss (Kern-Feature)

```
Playground (src/routes/index.tsx)
  → StyleEditor (JSON-Block) + subject (Textarea)
  → generateImage Server Function (src/server/generate.ts)
      → Stil-Anker aus DB laden (wenn styleId gesetzt)
      → compilePrompt() → JSON-Prompt-Text
      → geminiProvider.generate() → Gemini API
  → ResultGrid zeigt Bilder als data-URLs
```

### Provider-Abstraktion

`src/lib/providers/index.ts` exportiert `getProvider(id)`. Derzeit nur `gemini` implementiert (`src/lib/providers/gemini.ts`). Neue Provider (Imagen, GPT-Image) implementieren das `ImageProvider`-Interface aus `src/lib/providers/types.ts` und dort registrieren.

### Stil-Schema (Single Source of Truth)

`src/lib/schema/photoStyle.ts` — Zod-Schema (`looseObject` → unbekannte Keys bleiben erhalten für JSON-Escape-Hatch). Das Schema treibt:
- Formular-Rendering im `StyleEditor`
- Validierung beim Speichern
- Typen im gesamten Frontend

### Storage-Adapter

`src/lib/storage/local.ts` speichert Bilder lokal unter `data/images/` (konfigurierbar via `IMAGE_DIR` env-Variable). Für S3/Cloud-Storage: neuen Adapter als `StorageAdapter`-Interface implementieren und in `src/lib/storage/index.ts` registrieren, ohne Aufrufer anzupassen.

### Konsistenz-Mechanismus (Stil-Anker)

Gemini 3 Pro Image unterstützt keine Seeds. Konsistenz (~80–95 %) wird über **Anker-Bilder** erreicht: ein gespeicherter Stil kann bis zu 11 Referenzbilder pinnen (`anchorImageIds`). Diese werden bei jeder Produktion als `inlineData`-Parts vor dem Prompt-Text mitgeschickt. Ohne Anker: ~50–65 % Konsistenz.

### Datenmodell (Prisma)

- `Style` — gespeicherter Stil mit `styleJson`, `defaultParams`, `anchorImageIds`
- `StyleVersion` — Versionsverlauf (wird beim Update angelegt)
- `Generation` — jede API-Anfrage, verknüpft mit Stil und Output-Images
- `Image` — Bild-Metadaten; `kind` ist `output | anchor | upload | reference`
- `CameraBody` — Kamera-Presets für den StyleEditor

### Import-Alias

`#/*` → `./src/*` (in `package.json` `imports` und `tsconfig.json` konfiguriert). Immer `#/` statt relativer Pfade verwenden.

## Umgebungsvariablen

Siehe `.env.example`. Pflichtfeld: `GEMINI_API_KEY` (von https://aistudio.google.com/apikey). Nach Änderungen an `.env` den Dev-Server neu starten.

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
  - [`src/server/AGENTS.md`](src/server/AGENTS.md) — Server Functions
  - [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — Shared Library
    - [`src/lib/providers/AGENTS.md`](src/lib/providers/AGENTS.md) — ImageProvider-Interface
    - [`src/lib/schema/AGENTS.md`](src/lib/schema/AGENTS.md) — Zod-Schema (Single Source of Truth)
    - [`src/lib/storage/AGENTS.md`](src/lib/storage/AGENTS.md) — StorageAdapter-Interface
  - [`prisma/AGENTS.md`](prisma/AGENTS.md) — Datenmodell und Migrationen