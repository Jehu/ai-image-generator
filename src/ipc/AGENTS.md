# AGENTS.md — src/ipc/

## Purpose

Dünne IPC-Adapter zwischen React-Frontend und Rust-Backend. Jedes Modul spiegelt eine frühere Server-Function-Datei (`src/server/*` der Web-App) mit **identischen Signaturen und DTO-Typen** — intern läuft alles über Tauri `invoke()`.

## Ownership

Alle `.ts`-Dateien hier. Die Rust-Gegenstücke leben in `src-tauri/src/commands/`.

## Local Contracts

- **Signatur-Konvention beibehalten:** Funktionen mit Eingabe nehmen `{ data: Input }` (wie `createServerFn`), Funktionen ohne Eingabe nehmen nichts. So bleiben Aufrufer (Routen/Komponenten) unverändert portierbar.
- **Command-Namen:** snake_case-Pendant des Funktionsnamens (`generateImage` → `invoke('generate_image', { input })`). Das Argument heißt immer `input`.
- **Typen lokal definieren oder aus `#/lib/types.ts` importieren** — nie aus Rust generieren, nie `any`. Shape-Änderungen synchron mit `src-tauri/src/dto.rs`.
- `analyze.ts` validiert die Modell-Antwort clientseitig via `validatePhotoStyle` (Zod) — das Rust-Backend liefert nur das rohe `styleJson` (ohne `subject`).

## Modul-Übersicht

| Modul | Commands |
|---|---|
| `styles.ts` | list/get/create/update/delete/duplicate_style, list_style_versions, list_generations |
| `generate.ts` | generate_image |
| `images.ts` | get_image_data_url, get_style_anchors, add/remove_anchor_image |
| `analyze.ts` | analyze_style_from_image (+ clientseitige Validierung) |
| `styleBrief.ts` | compile_style_brief |
| `cameras.ts` | list/add/delete_camera_body |
| `models.ts` | list_available_models |
| `settings.ts` | get_settings_info |

## Verification

`npm test && npx tsc --noEmit` — plus End-to-End über `npm run dev:desktop`.
