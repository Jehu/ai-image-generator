# AGENTS.md — src/server/

## Purpose

Alle serverseitigen Server Functions (TanStack Start `createServerFn`). Diese Dateien laufen ausschließlich im Nitro-Server-Kontext — API-Key, Prisma und Storage sind hier gekapselt.

## Ownership

Alle `.ts`-Dateien in diesem Verzeichnis.

## Local Contracts

- **Prisma und Storage zwingend dynamisch importieren**: `const { prisma } = await import('#/db')` und `const { getStorage } = await import('#/lib/storage')` — immer innerhalb des `.handler()`-Callbacks, nie auf Modul-Top-Level. Statische Imports crashen den Browser-Build.
- **Jede Server Function gibt serialisierbare Typen zurück** — DTOs aus `src/lib/types.ts` oder primitive Typen. Keine `Date`-Objekte, keine Prisma-Row-Typen mit `unknown`-Feldern direkt zurückgeben.
- **`asJson`-Helper** für Prisma-`InputJsonValue`-Casts: `const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue` — Pattern aus `styles.ts` / `generate.ts` wiederverwenden.
- **Validierung via `.validator()`**: Input immer validieren bevor er den Handler erreicht; Fehler als `new Error(...)` werfen.

## Dateien-Übersicht

| Datei | Funktion |
|---|---|
| `generate.ts` | `generateImage` — Kern-Generierungsfunktion; lädt Anker, kompiliert Prompt, ruft Provider auf; persistiert bei Produce (`styleId` gesetzt) die Output-Bilder via Storage (`Image kind='output'`, `Generation.outputImageId`). Playground (ohne `styleId`) bleibt ephemer |
| `analyze.ts` | `analyzeStyleFromImage` — extrahiert aus einem Bild (base64 + mimeType) den fotografischen Stil als `photoStyle`-JSON via Gemini-Vision (`GEMINI_ANALYSIS_MODEL`, Default `gemini-2.5-flash`); kein Motiv/`subject`; tolerante Validierung, Schema-Issues als `warnings` |
| `styleBrief.ts` | `buildStyleBrief(styleJson, kind?)` — erzeugt aus dem Stil-JSON einen englischen Markdown-Style-Brief (Prosa) via Gemini-Text (`GEMINI_BRIEF_MODEL`, Default `gemini-2.5-flash`); `hashStyleJson`/`canonicalStringify` für den Source-Hash; `compileStyleBrief` als Client-Server-Function. Leerer Stil → leerer Brief (kein API-Call) |
| `styles.ts` | CRUD für `Style` + `StyleVersion`; `listGenerations`. Generiert beim `createStyle`/`updateStyle` den Style-Brief (best-effort, blockiert Speichern nicht); regeneriert nur bei geändertem `briefSourceHash` |
| `images.ts` | `addAnchorImage`, `removeAnchorImage`, `getImageDataUrl` |
| `cameras.ts` | `listCameraBodies`, `upsertCameraBody`, `deleteCameraBody` |
| `settings.ts` | `getSettingsInfo` — API-Key-Status (Gemini + OpenAI + OpenRouter, maskiert), Bild-Speicher, DB |
| `models.ts` | `listAvailableModels` — Modelle aller Provider mit gesetztem API-Key (füllt die UI-Modellauswahl) |

## Work Guidance

- Neue Server-seitige Features als neue `createServerFn`-Exporte in die thematisch passende Datei; bei größerem Scope neue Datei anlegen.
- `generate.ts` ist der kritischste Pfad (API-Kosten, Konsistenz): Anker-Logik und Provider-Aufruf dort nicht duplizieren.
