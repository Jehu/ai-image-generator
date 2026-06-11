# AGENTS.md — src/lib/schema/

## Purpose

Zod-Schema für den **Fotostil** als Single Source of Truth. Treibt Formular-Rendering, Validierung und TypeScript-Typen für die Bildart `foto`. Die Bildart-Registry (`src/lib/kinds/`, eigenes AGENTS.md) montiert dieses Material in `kinds/foto.ts`; andere Bildarten (illustration, infografik) bringen eigene Schemata mit. Änderungen hier propagieren über die Registry in `StyleEditor`/`PresetPicker` für Foto.

## Ownership

`photoStyle.ts`, `fields.ts` und Tests.

## Local Contracts

### `photoStyle.ts`

- `photoStyleSchema` — `z.looseObject` auf oberster Ebene **und** für alle Gruppen: unbekannte Keys bleiben erhalten (JSON-Tab als Escape-Hatch für nicht im Schema erfasste Felder).
- Alle Felder optional — Stile können von minimal bis hochdetailliert reichen.
- `validatePhotoStyle(value)` gibt `{ ok, issues }` zurück; im `StyleEditor` und beim Speichern aufrufen.
- `STYLE_GROUPS` (Tuple) legt die Reihenfolge der Formular-Gruppen fest.

### `fields.ts`

- `GROUPS` — Array von `GroupDef` mit Felddefinitionen; treibt das Rendering in `StyleEditor`.
- `TOP_FIELDS` — Felder auf Top-Level des Schemas (z. B. `mood`, `negative`).
- `FieldDef.type` bestimmt den Eingabe-Typ: `'text' | 'number' | 'boolean' | 'list' | 'colorlist'`.
- `options` in einer `FieldDef` füllt eine `<datalist>` (Autocomplete); für `body` werden DB-Einträge zur Laufzeit gemischt.

## Work Guidance

- Neues Stilfeld: erst Schema in `photoStyle.ts` erweitern, dann `FieldDef` in `fields.ts` eintragen. Sonst erscheint das Feld im JSON-Tab, aber nicht im Formular.
- Änderungen an `STYLE_GROUPS` ändern die Formular-Reihenfolge und müssen mit `fields.ts`-Reihenfolge übereinstimmen.

## Verification

```bash
npm test   # src/lib/schema/photoStyle.test.ts
```
