# AGENTS.md — src/lib/

## Purpose

Gemeinsam genutzte Bibliothek: Typen, Utilities, Prompt-Kompilierung und sonstige frameworkunabhängige Logik. Alles hier ist browser-sicher — serverseitige Logik lebt im Rust-Backend (`src-tauri/`).

## Ownership

Alle Dateien in `src/lib/` außer den drei Subdomains mit eigenem AGENTS.md.

## Local Contracts

- `types.ts` definiert die serialisierbaren DTO-Typen (`StyleDTO`, `GenerationDTO`, `StyleVersionDTO`). Diese sind die einzige erlaubte Form für Server-Function-Rückgaben.
- `json.ts` definiert `JsonValue` und `JsonObject` — die kanonischen Typen für beliebige JSON-Daten im System.
- `styleObject.ts` enthält die Lese/Schreib-Helfer für das Style-JSON-Objekt (`getGroupField`, `setGroupField`, `getTop`, `setTop`, `parseList`, `formatList`).
- `taxonomy.ts` enthält statische Preset-Listen für Foto (z. B. `CAMERA_BODIES`).
- `presets.ts` enthält vordefinierte Foto-Stil-Vorlagen; `StylePreset.category` ist `string` (jede Bildart bringt eigene Kategorien mit).
- `kinds/` (eigenes AGENTS.md) ist die **Bildart-Registry** — bündelt Schema/Felder/Presets pro `ImageKind`. `StyleEditor`/`PresetPicker` rendern generisch über `getKind(kind)`.
- `prompt/compile.ts` ist die einzige Stelle, die `styleJson + subject → promptText` kompiliert. Diese Funktion nie duplizieren. Dort liegt auch `wrapPromptForCopy` (Anweisung + Markdown-`json`-Fences ums `promptText` zum Kopieren) — beide Kopier-Buttons (`PromptPreview`, `ResultGrid`) nutzen ausschließlich diesen Helfer.
- `fileToDataUrl.ts` — **Browser-only** (nutzt `FileReader`, keine Node-Module). Stellt `fileToDataUrl` (File → Data-URL) und `parseDataUrl` (Data-URL → `{ mimeType, base64 }`) bereit. Nur aus React-Komponenten verwenden.
- `export.ts` — **Browser-only** (nutzt `window`/`document`/`Blob`/`File`/`jszip`, keine Node-Module). Stellt `slugify`, `downloadImagesAsZip`, `downloadStyleAsJson`, `downloadStyleBriefAsMarkdown`, `readStyleImport` für Bild-ZIP-, Stil-JSON- und Style-Brief-Markdown-Export bereit. Nur aus React-Komponenten verwenden.

## Work Guidance

- Neue **Foto**-Stil-Felder: in `src/lib/schema/photoStyle.ts` zum Zod-Schema hinzufügen, dann in `src/lib/schema/fields.ts` als `FieldDef` erfassen — dann rendert `StyleEditor` sie automatisch.
- Felder anderer Bildarten: im jeweiligen `kinds/<kind>.ts` (Schema + `groups`) ergänzen.
- Neue Bildart: siehe `kinds/AGENTS.md`.
- Änderungen an `compilePrompt` betreffen das Laufzeitverhalten jeder Generierung; bestehende Tests in `compile.test.ts` müssen grün bleiben. Bildart-Hinweise laufen über `CompileInput.kind`.

## Verification

```bash
npm test   # deckt compile.test.ts, photoStyle.test.ts, styleObject.test.ts, export.test.ts ab
```

## Child DOX Index

- [`kinds/AGENTS.md`](kinds/AGENTS.md) — Bildart-Registry (foto, illustration, infografik)
- [`providers/AGENTS.md`](providers/AGENTS.md) — ImageProvider-Interface; Gemini-, OpenAI- und OpenRouter-Implementierung
- [`schema/AGENTS.md`](schema/AGENTS.md) — Zod-Fotostil-Schema (Single Source of Truth für Foto)
