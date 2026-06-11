# AGENTS.md — src/lib/providers/

## Purpose

Nur noch **Typdefinitionen** für Provider-Parameter (`GenerateParams`, `ReferenceImage`, `AspectRatio`, `ImageSize`, …), die das Frontend (StyleEditor, IPC-Adapter, DTOs) braucht. Die Provider-**Implementierungen** leben seit dem Desktop-Port im Rust-Backend (`src-tauri/src/provider.rs` für Bildgenerierung, `src-tauri/src/llm.rs` für Vision/Text).

## Ownership

`types.ts` — sonst nichts. Die früheren TS-Implementierungen (gemini/openai/openrouter) wurden mit dem Rust-Port entfernt.

## Local Contracts

- Typen hier sind Teil des IPC-Kontrakts: Änderungen an `GenerateParams`/`ReferenceImage` müssen synchron in `src-tauri/src/dto.rs` nachgezogen werden.
- Die kuratierte OpenRouter-Modellliste lebt in `src-tauri/src/provider.rs` (`OPENROUTER_MODELS`); die UI bezieht sie zur Laufzeit über `listAvailableModels` (`src/ipc/models.ts`).

## Work Guidance

Neuen Provider anlegen (Rust): Modul nach Vorbild von `provider.rs` in `src-tauri/src/` implementieren, Modelle in `list_available_models` (`commands/misc.rs`) registrieren, `resolve_model()` erweitern. Frontend braucht keine Änderung — die Modellauswahl füllt sich automatisch.
