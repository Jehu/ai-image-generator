# AGENTS.md — Image Style Studio (Root)

## Purpose

Image Style Studio ist ein lokales Full-Stack-Tool zum Entwickeln, Speichern und konsistenten Anwenden von fotografischen Bildstilen für KI-Bildgenerierung (primär Gemini 3 Pro Image). Kern-Workflow: Stil im Playground finden → als Stil persistieren → in der Produktion nur noch das Motiv beschreiben.

## Ownership

- Gesamtes Repository; dieses Dokument ist das DOX-Rail für alle Subdomains.
- Stack: TanStack Start (Vite 8 + Nitro) · React 19 · TypeScript 6 · TailwindCSS v4 · Prisma + SQLite · `@google/genai`

## Local Contracts

### Drei kritische Implementierungsregeln (projektübergreifend)

1. **Prisma und Storage nur dynamisch importieren** — kein statischer Top-Level-Import von `#/db` oder `#/lib/storage`. Nur innerhalb von Server-Function-Handlern per `await import('#/db')` bzw. `await import('#/lib/storage')`. Statische Imports leaken Node-Only-Code (`fileURLToPath`) ins Client-Bundle und führen zum Browser-Crash.

2. **Server-Function-Rückgaben müssen vollständig serialisierbar sein** — keine `Date`-Objekte, keine rohen Prisma-Modelltypen. Immer DTOs aus `src/lib/types.ts` (`StyleDTO`, `GenerationDTO` etc.) zurückgeben; `Date` → `.toISOString()`.

3. **SQLite kennt keine Scalar-Arrays** — alle Arrays und strukturierten Objekte (`tags`, `anchorImageIds`, `styleJson`, `params`, `compiledPrompt`) liegen als `Json`-Spalten in Prisma. Beim Lesen stets explizit casten: `(row.tags as string[])`.

### Import-Alias

`#/*` → `./src/*` (definiert in `package.json` `imports` + `tsconfig.json`). Immer `#/` statt relativer Pfade.

### Routenbaum

`src/routeTree.gen.ts` wird von TanStack Router automatisch generiert — **nie manuell bearbeiten**. Neue Routen nur als Dateien in `src/routes/` anlegen.

### Generiertes Prisma-Clientverzeichnis

`src/generated/prisma/` wird von `prisma generate` erzeugt — **nie manuell bearbeiten**.

## Work Guidance

- Neue Server-Side-Features als `createServerFn` in `src/server/` kapseln; keine `fetch`-eigenen API-Routes.
- Neue Bildprovider als `ImageProvider`-Interface in `src/lib/providers/` implementieren und in `src/lib/providers/index.ts` registrieren.
- Foto-Schemaänderungen in `src/lib/schema/photoStyle.ts` starten; Formular-Rendering folgt automatisch via `src/lib/schema/fields.ts`. Andere Bildarten und neue Bildarten in `src/lib/kinds/` (eigenes AGENTS.md).
- Nach `prisma/schema.prisma`-Änderungen: `npm run db:push` (Entwicklung) oder `npm run db:migrate` (Produktion).

## Verification

```bash
npm test          # Vitest unit tests
npm run lint      # ESLint
npm run build     # TypeScript-Kompilierung + Bundling
```

## Child DOX Index

- [`src/routes/AGENTS.md`](src/routes/AGENTS.md) — Dateibasiertes Routing, Route-Konventionen
- [`src/components/AGENTS.md`](src/components/AGENTS.md) — React-UI-Komponenten
- [`src/server/AGENTS.md`](src/server/AGENTS.md) — Server Functions (TanStack Start)
- [`src/lib/AGENTS.md`](src/lib/AGENTS.md) — Shared Library: Schema, Prompt, Utility
- [`src/lib/kinds/AGENTS.md`](src/lib/kinds/AGENTS.md) — Bildart-Registry (foto, illustration, infografik)
- [`src/lib/providers/AGENTS.md`](src/lib/providers/AGENTS.md) — Provider-Abstraktion (ImageProvider-Interface)
- [`src/lib/schema/AGENTS.md`](src/lib/schema/AGENTS.md) — Zod-Fotostil-Schema (Single Source of Truth für Foto)
- [`src/lib/storage/AGENTS.md`](src/lib/storage/AGENTS.md) — Storage-Adapter-Interface
- [`prisma/AGENTS.md`](prisma/AGENTS.md) — Datenmodell, Schema-Regeln, Migrationen
