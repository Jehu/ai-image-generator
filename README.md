# Image Style Studio (Desktop)

Native **Desktop-App** (macOS · Windows · Linux), um **reproduzierbare Bildstile** für
KI-Bildgenerierung zu finden, zu fixieren und konsistent anzuwenden — über drei **Bildarten**:
**Foto**, **Illustration** und **Infografik**. Bildmodelle laufen über **OpenRouter**
(Nano Banana Pro / 2 / 1 = Gemini 3 Pro / 3.1 Flash / 2.5 Flash Image, GPT-5 Image,
GPT-5 Image Mini) — ein einziger API-Key.

Die App ist ein Fork der Web-Variante
([ai-image-generator-ui](https://github.com/Jehu/ai-image-generator-ui)), umgebaut auf
**Tauri 2 + Rust-Backend**: kein Server, kein Node zur Laufzeit — React-UI in der
System-WebView, Datenhaltung und KI-Calls in Rust.

**Workflow:** Im *Playground* die Bildart wählen, einen Stil per JSON/Formular finden → als
Stil speichern → in *Produktion* nur noch das Motiv beschreiben → optisch konsistente Bilder.
Stile sind über Tags organisierbar und werden als strukturiertes JSON gespeichert.

![Image Style Studio – Stil-Editor links, Produktion und Historie rechts](docs/screenshot.jpg)

> Links wird der Stil als strukturiertes Formular/JSON fixiert (Kamera, Optik, Licht, Farbe …),
> rechts beschreibt man nur noch das Motiv und erzeugt konsistente Varianten. Ergebnisse landen
> in der Historie und öffnen sich in einer Lightbox mit Download:

![Generiertes Ergebnis in der Lightbox](docs/screenshot-result.jpg)

## Wofür ist das?

KI-Bildmodelle liefern beim selben Prompt jedes Mal einen leicht anderen Look — ein Problem,
sobald man eine **einheitliche Bildsprache** braucht (Blog, Shop, Social Media, Markenauftritt).
Image Style Studio trennt **Stil** von **Motiv**: Du legst den fotografischen Look *einmal* fest
(Kamera, Optik, Licht, Farbe, Stimmung …), speicherst ihn und wendest ihn auf beliebig viele
Motive an — so wirken alle Bilder „wie aus einer Serie", statt zufällig zusammengewürfelt.

**Für wen:** Content-Creator, Marketing- und Social-Media-Teams, Blogger, Shop-Betreiber und
Agenturen — alle, die regelmäßig konsistente, markenkonforme KI-Bilder brauchen, ohne bei jedem
Bild den Prompt neu zu tüfteln.

## Was du damit machen kannst

- **Bildart wählen** — pro Stil eine von drei Bildarten festlegen; jede bringt ihr eigenes
  Formular, eigene Presets und ihr eigenes JSON-Schema mit:
  - **Foto** — fotorealistisch: Kamera, Optik, Licht, Color-Grade, Film-Emulation.
  - **Illustration** — gezeichnet/gerendert: Technik, Linien, Schattierung, Farbharmonie, Textur.
  - **Infografik** — Daten visuell: Layout, Icon-System, Farb-System, Typografie (Daten kommen
    übers Motiv).
- **Stile definieren** — den Look als strukturiertes Formular *oder* JSON festlegen, z. B. bei Foto:
  Kamera-Body, Brennweite, Blende, Licht-Setup, Farbpalette, Film-Emulation, Stimmung, Negativ-Guards.
- **Stil aus einem Bild ableiten** — ein vorhandenes (Kunden-)Foto hochladen; eine Vision-Analyse
  füllt das Stil-Formular automatisch vor und trifft Marken-Looks schnell.
- **Konsistenz über Anker** — Referenzbilder an einen Stil pinnen; sie werden bei jeder Produktion
  mitgeschickt und heben die optische Konsistenz deutlich an (siehe unten).
- **In Produktion gehen** — gespeicherten Stil wählen, nur noch Motive beschreiben (eine pro Zeile
  = Stapel) und konsistente Varianten erzeugen.
- **Modell wählen** — kuratierte Bildmodelle über **OpenRouter** (ein Key für alle Anbieter);
  das Modell ist pro Generierung umschaltbar.
- **Bibliothek** — Stile taggen, durchsuchen, duplizieren und versionieren.
- **Ergebnisse verwalten** — Historie mit Vorschau, Lightbox, Original-Download, Stapel-Download
  als ZIP und Kostenanzeige pro Lauf.
- **Teilen & sichern** — Stile als JSON exportieren und wieder importieren.
- **Auto-Update** — die App prüft beim Start auf neue Versionen (GitHub Releases) und
  installiert nach Rückfrage.

### Typische Anwendungsfälle

- Einheitliche **Blog-Header** über viele Artikel hinweg.
- **Produktbilder** im gleichen Studio-Look.
- Eine **Social-Media-Serie** mit wiedererkennbarer Ästhetik.
- Einen **Marken- oder Kunden-Look** schnell treffen — per „Stil aus Bild ableiten".

> Hinweis: Du brauchst einen eigenen **OpenRouter-API-Key** (https://openrouter.ai/keys) —
> einfach in den **Einstellungen** der App eintragen. Generierungen laufen über deinen Account
> und verursachen die jeweiligen Anbieterkosten; die Kosten pro Lauf werden angezeigt
> (bevorzugt aus `usage.cost` der API-Antwort).

## Setup (Entwicklung)

Voraussetzungen: Node 22+, Rust (stable), plattformübliche
[Tauri-Voraussetzungen](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run dev:desktop         # Desktop-App im Dev-Modus (Vite + Tauri)
```

**API-Key:** Den OpenRouter-Key trägst du direkt in der App unter **Einstellungen** ein —
er wird in `config.json` im App-Data-Verzeichnis gespeichert (Dateirechte 0600, nur das
Rust-Backend liest ihn) und ist nie Teil der Anwendung:
macOS `~/Library/Application Support/de.michelyweb.imagestylestudio/`,
Linux `~/.local/share/de.michelyweb.imagestylestudio/`, Windows `%APPDATA%\de.michelyweb.imagestylestudio\`.

Alternativ (z. B. für Entwicklung/CI) per Umgebungsvariable: `cp .env.example .env` und
`OPENROUTER_API_KEY` setzen. **Eine gesetzte Env-Variable hat Vorrang** vor dem in der UI
gespeicherten Key; die Einstellungen-Seite zeigt die wirksame Quelle an.

**Datenübernahme aus der Web-App:** Beim ersten Start sucht die App eine bestehende
`prisma/data/dev.db` + `data/images/` (im Arbeitsverzeichnis oder via `LEGACY_DATA_DIR`)
und übernimmt sie automatisch ins App-Data-Verzeichnis. Die Übernahme läuft genau einmal
(Marker-Datei `.legacy-migration-done`).

## Scripts

| Script | Zweck |
|---|---|
| `npm run dev:desktop` | Desktop-App im Dev-Modus (Hot-Reload) |
| `npm run build:release` | Release-Bundle inkl. Updater-Signatur (lädt den Key aus `~/.tauri/`) |
| `npm run build:release:universal` | wie oben, als macOS-Universal-Build (Apple Silicon + Intel) |
| `npm run build:desktop` | Desktop-Bundles ohne Updater-Signatur (CI setzt den Key via Secret) |
| `npm run dev` | Nur das Frontend im Browser (ohne Backend-Funktionen) |
| `npm run build` | Frontend-Produktions-Build (`dist/`) |
| `npm test` | Frontend-Unit-Tests (Vitest) |
| `cargo test` (in `src-tauri/`) | Rust-Unit-Tests (Prompt, Hashing, Storage, DB) |

## Installation (Nutzer)

Fertige Builds gibt es auf der [Releases-Seite](https://github.com/Jehu/ai-image-generator/releases/latest):
macOS-DMG (universal), Windows-Setup (`.exe`/`.msi`), Linux (`.AppImage`/`.deb`).
Für Arch-basierte Distributionen (CachyOS, EndeavourOS, …) liegt unter
[`packaging/aur/`](packaging/aur/) ein AUR-Paket (`image-style-studio-bin`).
macOS zeigt mangels Code-Signing beim ersten Start eine Gatekeeper-Warnung
(Systemeinstellungen → Datenschutz & Sicherheit → „Trotzdem öffnen").

## Releases & Auto-Update

Der GitHub-Workflow `.github/workflows/desktop-build.yml` baut bei einem `v*`-Tag
Bundles für macOS (universal), Windows und Linux und legt einen Release-Draft an.
**Code-Signing ist bewusst nicht konfiguriert** (Entscheidung 2026-06-11) — macOS/Windows
zeigen beim ersten Start entsprechende Warnungen.

Auto-Update läuft über den Tauri-Updater gegen `latest.json` des jeweils neuesten
GitHub-Releases. Die Update-Artefakte werden mit dem **Updater-Keypair** signiert
(unabhängig vom OS-Code-Signing): Secrets `TAURI_SIGNING_PRIVATE_KEY` (+ optional
`_PASSWORD`) im Repo hinterlegen; der zugehörige Public Key steht in
`src-tauri/tauri.conf.json`. Privater Schlüssel liegt lokal unter
`~/.tauri/image-style-studio.key` — **nicht** einchecken, nicht verlieren.

## Architektur

```
React 19 SPA (System-WebView)          Rust-Backend (src-tauri/)
  TanStack Router · React Query          Tauri 2 Commands (~20)
  src/ipc/*  ── invoke() ──────────▶     commands/  styles · generate · images · misc
  (gleiche Signaturen wie früher         provider.rs  OpenRouter (Bild-Generierung)
   die Server Functions)                 llm.rs       OpenRouter (Vision-Analyse, Brief)
                                         db.rs        SQLite (rusqlite, Prisma-Schema)
                                         storage.rs   Bilddateien im App-Data-Dir
                                         prompt.rs    Prompt-Kompilierung
                                         canonical.rs SHA-256 über kanonisches JSON
```

- **Frontend** (`src/`): unverändert React + TanStack Router als SPA. Alle Backend-Aufrufe
  laufen über `src/ipc/*` — dünne Adapter mit denselben Signaturen wie die früheren
  Server Functions, intern `invoke()` (Tauri IPC).
- **Rust-Backend** (`src-tauri/src/`): portiert die komplette Server-Logik.
  SQLite-Schema und DTO-Shapes (camelCase, ISO-Dates) sind 1:1 kompatibel zur Web-App —
  eine migrierte `dev.db` funktioniert ohne Umbau.
- **Provider**: nur **OpenRouter** (Chat-Completions, `modalities:["image","text"]`,
  `image_config` für die Gemini-Familie, Kosten aus `usage.cost` mit Live-Preis-Fallback,
  6 h gecacht). Stil-Analyse (Vision) und Style-Briefs laufen ebenfalls über OpenRouter
  (Default `google/gemini-2.5-flash`, via `OPENROUTER_ANALYSIS_MODEL` /
  `OPENROUTER_BRIEF_MODEL` änderbar). Legacy-Stile mit `provider: "gemini"` werden
  transparent auf das OpenRouter-Pendant gemappt.
- **Bildart-Registry** (`src/lib/kinds/`): jede Bildart (`foto`, `illustration`, `infografik`)
  bündelt ihr Zod-Schema, Formular-Gruppen, Default-Stil und Presets als `KindDef`. StyleEditor
  und PresetPicker rendern generisch aus der aktiven Bildart; `looseObject` → eigene
  JSON-Felder bleiben erhalten.
- **Prompt-Kompilierung**: in Rust (`prompt.rs`) für die Generierung, in TS
  (`src/lib/prompt/compile.ts`) für die Live-Vorschau — beide erzeugen identischen Output
  (Key-Reihenfolge inklusive; Rust nutzt `serde_json` mit `preserve_order`).
- **Datenmodell** (SQLite): `Style`, `StyleVersion`, `Generation`, `Image`, `CameraBody` —
  identisch zum früheren Prisma-Schema; Arrays/Objekte als JSON-Spalten.

### Konsistenz-Mechanik
Die Bildmodelle haben **keine Seeds**. Reine Prompts erreichen ~50–65 % Konsistenz.
Der stärkste Hebel sind **Stil-Anker** (Referenzbilder, bis 11): ein gespeicherter Stil pinnt
optional Anker-Bilder, die bei jeder Produktion als Referenz mitgeschickt werden → ~80–95 %.

## Wichtige Implementierungs-Hinweise

- **Backend-Aufrufe nur über `src/ipc/*`** — Komponenten/Routen importieren nie `invoke`
  direkt. Neue Backend-Funktion = Rust-Command + IPC-Adapter mit DTO-Typen.
- **DTO-Kontrakt**: Rust-DTOs (`src-tauri/src/dto.rs`) spiegeln `src/lib/types.ts`
  (camelCase via serde, Dates als ISO-Strings). Änderungen immer auf beiden Seiten.
- **Prompt-/Hash-Parität**: `prompt.rs` ↔ `compile.ts` und `canonical.rs` ↔
  `canonicalJson.ts` müssen identischen Output liefern (Tests vorhanden) — sonst brechen
  Brief-Hashes und Prompt-Reproduzierbarkeit.
- SQLite kennt keine Scalar-Arrays → Listen/Objekte liegen als JSON-Spalten (TEXT).

## Lizenz

[MIT](LICENSE)
