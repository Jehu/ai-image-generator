# AGENTS.md — prisma/

## Purpose

Datenmodell und Migrationsartefakte für Image Style Studio. SQLite lokal; Modell ist auf PostgreSQL-Migration vorbereitet.

## Ownership

`schema.prisma`, `seed.ts` und alle `migrations/`-Dateien.

## Local Contracts

### Schema-Regeln

- **Keine Scalar-Arrays in SQLite** — alle Listen und strukturierten Objekte als `Json`-Spalten: `tags Json`, `anchorImageIds Json`, `styleJson Json`, `defaultParams Json`, `params Json`, `compiledPrompt Json`. Beim Lesen in TypeScript immer explizit casten.
- Prisma Client Output: `output = "../src/generated/prisma"` — generiertes Verzeichnis nie manuell bearbeiten.
- `datasource db { provider = "sqlite" }` — für PostgreSQL: Provider ändern + Driver-Adapter in `src/db.ts` tauschen; Modell-Felder bleiben kompatibel.

### Modelle

| Modell | Zweck | Besonderheiten |
|---|---|---|
| `Style` | Gespeicherter Stil | `kind` (`foto`/`illustration`/`infografik`, Default `foto`); `anchorImageIds Json` (string[]) — Referenzbilder für Konsistenz; `styleBrief String?` — LLM-Markdown-Brief (Prosa), `briefSourceHash String?` — SHA-256 des kanonischen `styleJson`, Brief nur bei echter Änderung neu generiert |
| `StyleVersion` | Versionsverlauf eines Stils | Wird beim `updateStyle` angelegt wenn `styleJson` sich ändert |
| `Generation` | Jeder API-Call | `compiledPrompt Json` = exakter Prompt; `status`: `pending/done/error` |
| `Image` | Bild-Metadaten | `kind`: `output | anchor | upload | reference`; `path` relativ zu cwd |
| `CameraBody` | Kamera-Presets | `name` unique; wird im `StyleEditor` als Autocomplete genutzt |

### Workflow

```bash
npm run db:push      # Schema-Änderung in Entwicklung sofort anwenden
npm run db:migrate   # Produktions-Migration erstellen (erzeugt SQL-Datei)
npm run db:generate  # Prisma Client neu generieren (nach schema.prisma-Änderung)
npm run db:seed      # Seed-Daten laden (src/seed.ts)
```

## Work Guidance

- Nach jeder `schema.prisma`-Änderung: `npm run db:push && npm run db:generate`.
- Anker werden bei `duplicateStyle` **nicht** mitkopiert (`anchorImageIds: []`) — das ist Absicht (neue Stil-Variante startet ohne Konsistenz-Fixierung).
- `Generation.status` bleibt derzeit immer `done` bei erfolgreicher Generierung; `pending/error` sind für künftige asynchrone Verarbeitung vorbereitet.
