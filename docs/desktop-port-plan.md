# Desktop-Port-Plan: Image Style Studio → native Rust-Desktop-App

> **Status (2026-06-11): UMGESETZT.** Alle Phasen implementiert; Code-Signing wurde
> per Entscheidung übersprungen (unsignierte Builds, Updater-Keypair vorhanden).
> Abweichung vom Plan: **rusqlite statt sqlx** (synchron, bundled — weniger
> Build-Komplexität bei identischem Schema); `analyze`/`brief` laufen wie unter
> „Festlegungen" beschrieben über OpenRouter. Architektur-Doku: README.md + CLAUDE.md
> + AGENTS.md-Hierarchie. Dieses Dokument bleibt als Planungs-/Entscheidungsreferenz.

**Stand:** 2026-06-11
**Entscheidung:** Tauri 2 · React-Frontend behalten · Backend nach Rust portieren.

**Getroffene Festlegungen:**
- **Plattformen:** macOS · Windows · Linux (alle drei)
- **Code-Signing & Auto-Update:** von Anfang an
- **Daten-Migration:** vorhandene `dev.db` + Bilder beim ersten Start automatisch ins App-Data-Dir übernehmen
- **Provider-Scope:** zunächst **nur OpenRouter**. Gemini- und OpenAI-Direktprovider später.
  - ⚠️ **Konsequenz:** `analyze_style_from_image` (Vision) und `build_style_brief` (Text) laufen heute direkt über Gemini. Ohne Gemini-Provider müssen beide über **OpenRouter-Chat-Completions** mit einem Vision-/Text-fähigen Modell umgesetzt werden. Vorteil: alle KI-Calls über einen HTTP-Client.

---

## 1. Ausgangslage & Begründung

Die Web-App ist faktisch bereits eine **lokale Single-User-App**, nur in eine SSR-Hülle (TanStack Start + Nitro) verpackt:

| Baustein | Heute | Konsequenz für Desktop |
|----------|-------|------------------------|
| Datenbank | SQLite via `better-sqlite3` (embedded) | Kein DB-Server — direkt in Rust übernehmbar |
| „Server"-Logik | 9 `createServerFn`-Dateien (893 LOC) | Wird zu Tauri-Commands (Rust) |
| AI-Provider | Gemini / OpenAI / OpenRouter, reine HTTP-Calls (799 LOC) | `reqwest` in Rust |
| Storage | lokales FS `data/images/` hinter 3-Methoden-Interface (80 LOC) | `std::fs` hinter Rust-Trait |
| Auth / Multi-User | keine | nichts zu portieren |

**Warum kein reiner Tauri-Wrapper:** TanStack Start braucht zur Laufzeit eine Node/Nitro-Runtime für SSR + Server Functions. Ohne Node-Sidecar (fragil, großes Bundle, kein echtes Rust) nicht wrappbar.

**Warum React behalten:** Das Frontend (~2.800 LOC UI + 414 LOC dynamisches Zod-Schema + CodeMirror-JSON-Editor) ist der ausgereifteste und größte Teil. Ein Rust-GUI-Rewrite (Dioxus/egui/Slint) wäre der mit Abstand größte Aufwand bei schlechterer UI. Stattdessen: React läuft als **reines SPA** in Tauris WebView, das Rust-Backend ersetzt die Server Functions.

---

## 2. Zielarchitektur

```
┌─────────────────────────────────────────────┐
│  Tauri 2 App                                 │
│                                              │
│  WebView (System-WebView, kein Node)         │
│   └─ React 19 SPA (TanStack Router, client)  │
│       └─ src/ipc/*  ── invoke() ──┐          │
│                                   │          │
│  Rust-Backend (src-tauri/)        ▼          │
│   ├─ commands/   (≈ ehem. src/server/*)      │
│   ├─ providers/  (gemini, openai, openrouter)│
│   ├─ db/         (sqlx + SQLite + migrations) │
│   ├─ storage/    (trait + local fs)          │
│   ├─ prompt/     (compile)                   │
│   └─ schema/     (photoStyle-Validierung)    │
│                                              │
│  SQLite-Datei + data/images/  (App-Data-Dir) │
└─────────────────────────────────────────────┘
        │ reqwest (HTTPS)
        ▼
  Gemini / OpenAI / OpenRouter APIs
```

**Rust-Crates (Vorschlag):**
- `tauri` v2 — App-Shell, IPC, Packaging, Updater
- `sqlx` (sqlite, runtime-tokio) — DB-Zugriff + compile-time-checked Queries + Migrationen
- `reqwest` (json, multipart) — AI-API-Calls
- `serde` / `serde_json` — DTOs & loose-JSON (`serde_json::Value` für `styleJson`)
- `tokio` — async runtime
- `thiserror` / `anyhow` — Fehlerbehandlung
- `cuid2` — IDs (Prisma nutzt cuid)
- `sha2` — `briefSourceHash`
- `uuid` — Storage-Dateinamen
- `base64`, `chrono`

---

## 3. Mapping: Server Function → Tauri Command

Alle Rückgaben bleiben **identisch zu den bestehenden DTOs** (`StyleDTO`, `GenerationDTO`, … aus `src/lib/types.ts`) — camelCase, Dates als ISO-Strings — damit das Frontend unverändert bleibt.

| Datei (heute) | Commands (Rust) |
|---------------|-----------------|
| `generate.ts` | `generate_image` |
| `images.ts` | `get_image_data_url`, `get_style_anchors`, `add_anchor_image`, `remove_anchor_image` |
| `styles.ts` | `list_styles`, `get_style`, `create_style`, `update_style`, `delete_style`, `duplicate_style`, `list_style_versions`, `list_generations` |
| `analyze.ts` | `analyze_style_from_image` |
| `styleBrief.ts` | `compile_style_brief` (+ interne `build_style_brief`, `hash_style_json`) |
| `cameras.ts` | `list_camera_bodies`, `add_camera_body`, `delete_camera_body` |
| `models.ts` | `list_available_models` |
| `settings.ts` | `get_settings_info` |

→ **~25 Commands.**

---

## 4. Frontend-Anbindung (Schlüssel für minimale UI-Änderung)

Heute importieren Komponenten Server Functions direkt (`import { generateImage } from '#/server/generate'`). Strategie:

1. **IPC-Adapter-Layer** `src/ipc/` erstellen: ein Modul pro ehemaliger Server-Datei, das **dieselben Funktionsnamen + Signaturen** exportiert, intern aber `invoke('generate_image', args)` ruft.
2. Importpfade `#/server/*` → `#/ipc/*` umbiegen (mechanisch, ggf. per Alias).
3. Routen entschlacken: TanStack-Start-Spezifika raus (`createServerFn`, SSR-`loader` die serverseitig liefen → React-Query-`queryFn` mit invoke).

So bleibt der UI-Code (Komponenten, Schema-Rendering, CodeMirror) nahezu unangetastet.

**Bild-Auslieferung:** Heute data-URLs. Beibehalten für Einfachheit (Commands geben weiterhin data-URLs zurück); optional später Tauri `asset:`-Protokoll via `convertFileSrc` für große Galerien (Performance).

---

## 5. Knifflige Stellen (Risiken)

| Thema | Risiko | Maßnahme |
|-------|--------|----------|
| Gemini `@google/genai` | SDK kapselt `inlineData`-Parsing | Per REST nachbauen (`:generateContent`), Anker als `inlineData`-Parts; gut isoliert testbar |
| OpenAI `images.edit` | Multipart-Upload mehrerer Referenzbilder | `reqwest::multipart`; Aspect-Ratio→Size-Mapping 1:1 übernehmen |
| OpenRouter | Live-Pricing-Cache (6 h) + `usage.cost`-Fallback | `tokio`-Cache (Mutex/`OnceCell` + Timestamp) |
| Zod `looseObject` | Unbekannte Keys müssen erhalten bleiben | `styleJson` als `serde_json::Value` durchreichen, nur bekannte Felder validieren |
| Prisma-`Json`-Spalten | SQLite kennt keine Arrays | In sqlx als `TEXT` (JSON-String) speichern, in/out (de)serialisieren — wie heute |
| DTO-Drift | Frontend erwartet exakte Shapes | DTOs in Rust mit `#[serde(rename_all = "camelCase")]` spiegeln; Dates als ISO-String |
| cuid-IDs | Prisma `@default(cuid())` | `cuid2`-Crate; bestehende IDs bleiben gültig (nur Strings) |
| Migration bestehender Daten | dev.db evtl. schon befüllt | sqlx-Migration aus `schema.prisma` ableiten; Schema ist identisch → vorhandene `.db` weiternutzbar |

---

## 6. Phasenplan & Aufwandsschätzung (Solo)

| # | Phase | Inhalt | Aufwand |
|---|-------|--------|---------|
| 0 | **Setup** | Tauri 2 ins Repo, Vite SSR→SPA, TanStack Router auf Client-Routing, Dev-/Build-Pipeline, App-Data-Dir-Pfade | 1–2 d |
| 1 | **Rust-Fundament** | Workspace, Fehler-Typen, Config/Env (API-Keys, IMAGE_DIR, DB-Pfad), DTOs (serde), sqlx-Setup + Migration aus Prisma-Schema | 2–3 d |
| 2 | **Storage** | `StorageTrait` + Local-FS-Impl (saveBase64/readAsBase64/remove) | 0.5 d |
| 3 | **Provider** | `ImageProvider`-Trait + **nur OpenRouter** (Chat-Completions, Pricing-Cache). Trait so schneiden, dass Gemini/OpenAI später andocken | 1.5–2 d |
| 4 | **Prompt & Schema** | `compile_prompt` (pure logic) + photoStyle-Validierung (loose) | 1–2 d |
| 5 | **Commands** | Alle ~25 Commands inkl. `analyze`/`brief` **über OpenRouter** (Vision/Text), Versionierung/History | 3–4 d |
| 6 | **Frontend-IPC** | `src/ipc/`-Adapter, Importe umbiegen, Routen entschlacken (SSR-Loader → invoke) | 2–3 d |
| 6b | **Daten-Migration** | First-run-Check: vorhandene `dev.db` + `data/images/` → App-Data-Dir kopieren/migrieren, idempotent | 0.5–1 d |
| 7 | **Packaging & Signing** | Icons, Bundles (dmg/msi/AppImage), **Signing macOS+Windows**, **Tauri-Updater** (Keypair + `latest.json`-Hosting), CI-Build-Matrix 3 OS | 4–6 d |
| 8 | **QA & Tests** | Rust-Unit-Tests (Provider/Compile), Parität-Durchlauf, Fehlerpfade, Test auf allen 3 Plattformen | 3–4 d |

**Summe: ~3,5–4,5 Wochen** (eine Person). Nur-OpenRouter spart bei den Providern, aber Signing/Auto-Update + 3-Plattform-Matrix kosten das wieder ein. Der Aufwand in Phase 7 hängt stark davon ab, wie schnell die externen Zertifikate/Accounts (siehe §8) verfügbar sind.

---

## 7. Reihenfolge der ersten Schritte (konkret)

1. `pnpm`/`npm` + `cargo` Toolchain prüfen, Rust + Tauri-CLI installieren.
2. Tauri 2 in bestehendes Repo initialisieren (`src-tauri/`), `tauri.conf.json` auf Vite-Dev-Server (Port 3000) + SPA-Build-Output zeigen.
3. `vite.config.ts`: `tanstackStart()`/`nitro()` entfernen, reines `viteReact()` + `@tanstack/router-plugin` (SPA-Modus), `tailwindcss()`.
4. Erstes „Hello"-Command (`get_settings_info`) end-to-end durch IPC beweisen.
5. Dann Phasen 1→8 abarbeiten.

---

## 8. Externe Voraussetzungen für Signing & Auto-Update (Beschaffung durch Marco)

Diese müssen **vor Phase 7** vorliegen — Code allein genügt nicht:

**macOS:**
- Apple Developer Program (99 USD/Jahr)
- „Developer ID Application"-Zertifikat (für Distribution außerhalb des App Store)
- Notarisierung: App-spezifisches Passwort **oder** App-Store-Connect-API-Key (Issuer-ID, Key-ID, `.p8`)

**Windows:**
- Authenticode-Code-Signing-Zertifikat (OV reicht; EV vermeidet SmartScreen-Warnung sofort, ist aber teurer + Hardware-Token/HSM). Ohne Zertifikat: SmartScreen-Warnung beim ersten Start.

**Linux:**
- AppImage/.deb — Signing optional; GPG-Signatur empfehlenswert, kein Pflicht-Account.

**Auto-Update (Tauri Updater, plattformübergreifend):**
- Eigenes **Updater-Signing-Keypair** (`tauri signer generate`) — getrennt vom OS-Signing
- Hosting für Update-Artefakte + `latest.json` (z. B. GitHub Releases am bestehenden Repo `Jehu/ai-image-generator`)

**Empfehlung:** Phasen 0–6b sind von den Zertifikaten unabhängig und können sofort starten. Parallel die Accounts/Zertifikate beschaffen, damit Phase 7 nicht blockiert.
