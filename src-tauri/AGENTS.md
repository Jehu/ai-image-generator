# AGENTS.md — src-tauri/ (Rust-Backend)

## Purpose

Vollständiges Backend der Desktop-App: Tauri-Commands (ersetzen die Server Functions der Web-App), OpenRouter-Anbindung, SQLite-Datenhaltung, Bild-Storage, Prompt-Kompilierung, Legacy-Datenübernahme.

## Ownership

Alles unter `src-tauri/`. Frontend-Gegenstücke der Commands: `src/ipc/`.

## Local Contracts

- **DTO-Spiegel:** `src/dto.rs` entspricht `src/lib/types.ts` (serde `rename_all = "camelCase"`, Dates als ISO-Strings). Fehlertexte sind deutsch und wörtlich aus den früheren Server Functions übernommen — die UI zeigt sie direkt an.
- **DB-Schema = Prisma-Schema:** Tabellen-/Spaltennamen in `db.rs::migrate()` exakt wie von `prisma db push` erzeugt (`"Style"`, `"styleJson"`, …). Eine migrierte `dev.db` der Web-App muss ohne Umbau laufen. DateTime-Werte tolerant lesen (`read_datetime`: ISO-Text oder Unix-ms).
- **rusqlite ist synchron:** DB-Guard (`state.db.lock()`) **nie über ein `.await` halten** — erst lesen, Guard droppen, dann HTTP-Call, dann neu locken.
- **Config nur als Snapshot nutzen:** Commands holen `state.config()` (Clone) statt eines Locks — die Settings-UI kann die Config jederzeit per `reload_config()` austauschen. Env-Werte haben Vorrang vor config.json.
- **Prompt-/Hash-Parität:** `prompt.rs` und `canonical.rs` müssen byte-identischen Output zu `src/lib/prompt/compile.ts` bzw. `src/lib/canonicalJson.ts` liefern (serde_json-Feature `preserve_order` ist dafür Pflicht — nicht entfernen).
- **Provider-Scope:** nur OpenRouter (`provider.rs`). Legacy-`provider: "gemini"` wird in `resolve_model()` gemappt; andere Provider geben einen verständlichen Fehler.

## Modul-Übersicht

| Modul | Funktion |
|---|---|
| `lib.rs` | Builder, Plugin-Registrierung, Setup (Pfade, Config, Legacy-Migration, DB), Command-Registry |
| `commands/styles.rs` | Style-CRUD, Versionierung, Generierungs-Historie |
| `commands/generate.rs` | Bildgenerierung inkl. Anker-Referenzen + Persistierung |
| `commands/images.rs` | Anker-Lifecycle (add/remove/get) |
| `commands/misc.rs` | Analyze, Style-Brief, Kameras, Modelle, Settings (lesen + `save_settings` → config.json, Config-Reload) |
| `provider.rs` | OpenRouter-Bildgenerierung, kuratierte Modellliste, Pricing-Cache (6 h) |
| `llm.rs` | OpenRouter-Vision (Stil-Analyse) + Text (Style-Brief); Instruktionen wörtlich aus der Web-App |
| `db.rs` | Connection, idempotente Migration, DateTime-/JSON-Helfer |
| `repo.rs` | Row-Mapper auf DTOs (entspricht `toStyleDTO` & Co.) |
| `storage.rs` | Bilddateien im App-Data-Dir (save/read/remove, UUID-Dateinamen) |
| `prompt.rs` | `compile_prompt` + `is_empty_style` |
| `canonical.rs` | Kanonisches JSON + SHA-256 (`briefSourceHash`) |
| `config.rs` | Env + `config.json` (App-Data, via Settings-UI beschreibbar, 0600); Quellen-Tracking (env vor config); Pfad-Auflösung |
| `legacy_migrate.rs` | Einmalige Übernahme von `prisma/data/dev.db` + `data/images` |

## Work Guidance

- Neuer Command: Modul in `commands/`, DTOs in `dto.rs`, Registrierung in `lib.rs`, IPC-Adapter in `src/ipc/` — alle vier Schritte gehören zusammen.
- Schema-Erweiterungen: `migrate()` bleibt idempotent; neue Spalten brauchen einen `ALTER TABLE`-Pfad für Bestands-DBs.
- Updater: Public Key in `tauri.conf.json`; privater Schlüssel lokal `~/.tauri/image-style-studio.key` + CI-Secret `TAURI_SIGNING_PRIVATE_KEY`. Kein OS-Code-Signing (Entscheidung 2026-06-11).

## Verification

```bash
cargo test          # Unit-Tests (Prompt, Canonical, Storage, DB)
cargo check         # Typprüfung
npm run dev:desktop # End-to-End
```
