# AGENTS.md — src/components/

## Purpose

Wiederverwendbare React-Komponenten ohne eigenen Server-Zugriff. Alle Daten kommen als Props oder via TanStack Query-Hooks, die Server Functions aus `#/server/` aufrufen.

## Ownership

Alle `.tsx`-Dateien in diesem Verzeichnis.

## Local Contracts

- **Kein direkter Prisma- oder Storage-Import** — Komponenten laufen im Client-Bundle. Server-Seite bleibt in `src/server/`.
- **Kein direkter API-Key-Zugriff** — `GEMINI_API_KEY` und andere Secrets sind ausschließlich serverseitig.
- Shadcn-Komponenten via `pnpm dlx shadcn@latest add <name>` installieren; die generierten Dateien landen je nach Konfiguration unter `src/components/ui/`.

## Komponenten-Übersicht

| Datei | Funktion |
|---|---|
| `StyleEditor.tsx` | Haupt-Editor mit Formular- und JSON-Tab; `kind`-Prop wählt die Bildart, rendert Gruppen/Top-Felder generisch aus `getKind(kind)` (`src/lib/kinds/`) |
| `AnchorManager.tsx` | Anker-Bilder eines Stils anzeigen, hinzufügen, entfernen |
| `ResultGrid.tsx` | Generierungs-Ergebnisse als Bildgitter; Klick öffnet die `Lightbox`; „Als Anker setzen"-Aktion |
| `Lightbox.tsx` | Vollbild-Ansicht generierter Bilder (Portal); Navigation per Pfeil/Tasten, Download des Originalbildes via `downloadDataUrl` aus `#/lib/export` |
| `ModelPicker.tsx` | Dropdown zur Wahl des Bildmodells; lädt `listAvailableModels`, rendert nur bei >1 verfügbarem Modell, fällt bei fehlendem Modell auf das erste verfügbare zurück |
| `SaveStyleDialog.tsx` | Dialog zum Speichern des aktuellen Stils aus dem Playground |
| `PromptPreview.tsx` | Echtzeit-Vorschau des kompilierten Prompts (via `compilePrompt`) |
| `PresetPicker.tsx` | Kuratierte Stil-Vorlagen der aktiven Bildart (`kind`-Prop → `getKind(kind).presets`) |
| `InfoHint.tsx` | Kleines Tooltip-Icon für Feldbeschreibungen |

## Work Guidance

- `StyleEditor` rendert Felder generisch aus der Bildart-Registry (`getKind(kind).groups` / `.topFields`). Neue Felder im jeweiligen `kinds/<kind>.ts` (Foto: `src/lib/schema/fields.ts`) eintragen, nicht in der Komponente hardcoden.
- `AnchorManager` nutzt `addAnchorImage` / `removeAnchorImage` aus `src/server/images.ts`.
