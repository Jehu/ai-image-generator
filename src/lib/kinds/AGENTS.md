# AGENTS.md — src/lib/kinds/

## Purpose

Bildart-Registry. Bündelt pro `ImageKind` (`foto | illustration | infografik`) das Schema, die Formular-Gruppen, Default-Stil, Presets und die Validierung in eine `KindDef`. `StyleEditor`, `PresetPicker` und die Routen rendern generisch aus `getKind(kind)`, statt ein Schema hart zu verdrahten.

## Ownership

`index.ts`, `types.ts`, `foto.ts`, `illustration.ts`, `infografik.ts`, `kinds.test.ts`.

## Local Contracts

- `types.ts` — `ImageKind`, `IMAGE_KINDS`, `DEFAULT_KIND`, `KindDef`, `TopFieldDef`, `asImageKind` (Coerce + Fallback `foto`), `makeValidator(zodSchema)` (baut `validate` in der Form von `validatePhotoStyle`).
- `index.ts` — `KINDS` (Record), `getKind(kind)` (Fallback foto), `KIND_LIST` (feste Reihenfolge). Re-exportiert die öffentlichen Typen/Helfer.
- `foto.ts` — montiert die bestehende **Single Source of Truth** für Foto (`schema/photoStyle`, `schema/fields`, `taxonomy`, `presets`) in die `KindDef`-Form. Foto-Felder werden weiter dort gepflegt, nicht hier dupliziert.
- `illustration.ts` / `infografik.ts` — eigenständig: Zod-`looseObject`-Schema, `groups` (`FieldDef[]`), `topFields`, `defaultStyle`, `presets` (+ `presetCategories`).
- Jedes `defaultStyle` und jeder Preset-`styleJson` **muss** gegen das eigene Schema validieren (durch `kinds.test.ts` abgesichert).
- `dynamicOptionKeys` — Feld-Keys mit Laufzeit-Optionen (nur Foto: `['body']` für Kamera-Bodys).

## Work Guidance

- Neue Bildart: Modul `kinds/<kind>.ts` mit `KindDef` anlegen, in `IMAGE_KINDS` (types.ts) und `KINDS` (index.ts) registrieren, Preset-Kategorien zu allen Presets passend halten.
- Neues Feld einer bestehenden Bildart: Zod-Schema **und** passende `FieldDef` in `groups` ergänzen (sonst erscheint es nur im JSON-Tab).
- Foto-Felder ausschließlich in `src/lib/schema/` + `src/lib/taxonomy.ts` ändern.
- `compilePrompt` ist bildart-generisch; bildartspezifische Prompt-Hinweise (z. B. `text_rendering` für Infografik) liegen in `prompt/compile.ts`, gesteuert über `CompileInput.kind`.

## Verification

```bash
npm test   # src/lib/kinds/kinds.test.ts (Registry, Default-/Preset-Validierung)
```
