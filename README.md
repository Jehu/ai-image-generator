# Image Style Studio

Lokales Tool, um **reproduzierbare Bildstile** für KI-Bildgenerierung (Gemini 3 Pro
Image / „Nano Banana Pro", optional OpenAI GPT Image oder Modelle über OpenRouter) zu finden,
zu fixieren und konsistent anzuwenden — über drei **Bildarten**: **Foto**, **Illustration**
und **Infografik**.

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
- **Modell wählen** — Google Gemini (Nano Banana Pro) und OpenAI (GPT Image) direkt, oder eine
  kuratierte Auswahl über **OpenRouter** (ein Key statt Vendor-Keys je Anbieter); sind mehrere
  Keys gesetzt, lässt sich das Modell pro Generierung umschalten.
- **Bibliothek** — Stile taggen, durchsuchen, duplizieren und versionieren.
- **Ergebnisse verwalten** — Historie mit Vorschau, Lightbox, Original-Download, Stapel-Download
  als ZIP und Kostenanzeige pro Lauf.
- **Teilen & sichern** — Stile als JSON exportieren und wieder importieren.

### Typische Anwendungsfälle

- Einheitliche **Blog-Header** über viele Artikel hinweg.
- **Produktbilder** im gleichen Studio-Look.
- Eine **Social-Media-Serie** mit wiedererkennbarer Ästhetik.
- Einen **Marken- oder Kunden-Look** schnell treffen — per „Stil aus Bild ableiten".

> Hinweis: Du brauchst einen eigenen API-Key (Google Gemini, optional OpenAI oder OpenRouter).
> Generierungen laufen über deinen Account und verursachen die jeweiligen Anbieterkosten; die
> geschätzten Kosten pro Lauf werden angezeigt.

## Setup

```bash
npm install
cp .env.example .env        # GEMINI_API_KEY eintragen (https://aistudio.google.com/apikey)
                            # optional OPENAI_API_KEY für GPT-Image-Modelle
                            # optional OPENROUTER_API_KEY für OpenRouter-Modelle
npm run db:push             # SQLite-Schema anlegen
npm run dev                 # http://localhost:3000
```

Pflichtfeld ist `GEMINI_API_KEY`. Ist zusätzlich `OPENAI_API_KEY` oder `OPENROUTER_API_KEY`
gesetzt, lässt sich das Modell pro Generierung umschalten. API-Keys nach Änderung der `.env`
neu laden → Dev-Server neu starten.

## Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Dev-Server (Vite) |
| `npm run build` / `npm run preview` | Produktions-Build / Vorschau |
| `npm test` | Unit-Tests (Vitest) |
| `npm run test:gen` | Einmaliger End-to-End-Gemini-Test (1 Bild, 1K) |
| `npm run db:push` / `db:studio` | Schema sync / Prisma Studio |

## Architektur

- **TanStack Start** (Vite + Router) + React + TypeScript. Server Functions (`src/server/*`)
  halten den API-Key serverseitig.
- **Prisma + SQLite** (`prisma/schema.prisma`) lokal. Für Team später: Provider auf
  `postgresql` + passenden Driver-Adapter in `src/db.ts`; Modell ist vorbereitet.
- **Provider-Abstraktion** (`src/lib/providers/`): Gemini (`gemini-3-pro-image` via
  `@google/genai`), OpenAI (`gpt-image-1`/`gpt-image-2` via `openai`) und OpenRouter (kuratierte
  Bildmodelle über den Chat-Completions-Endpoint mit `modalities:["image","text"]`) implementiert.
  Sind mehrere API-Keys gesetzt, wählt man das Modell pro Generierung; Imagen o.Ä. später einsteckbar.
- **Bildart-Registry** (`src/lib/kinds/`): jede Bildart (`foto`, `illustration`, `infografik`)
  bündelt ihr Zod-Schema, Formular-Gruppen, Default-Stil und Presets als `KindDef`. StyleEditor
  und PresetPicker rendern generisch aus der aktiven Bildart. Das Foto-Schema
  (`src/lib/schema/photoStyle.ts`) ist die Vorlage; `looseObject` → eigene JSON-Felder bleiben
  erhalten.
- **Prompt-Kompilierung** (`src/lib/prompt/compile.ts`): fixiertes Stil-JSON + `subject` →
  Prompt; bei Ankern Stil-Transfer-Anweisung.
- **Storage-Adapter** (`src/lib/storage/`): lokaler Filesystem-Adapter (`data/images`);
  S3/Objekt-Storage später ohne Aufrufer-Umbau.

### Konsistenz-Mechanik
Gemini 3 Pro Image hat **keine Seeds**. Reine Prompts erreichen ~50–65 % Konsistenz.
Der stärkste Hebel sind **Stil-Anker** (Referenzbilder, bis 11): ein gespeicherter Stil pinnt
optional Anker-Bilder, die bei jeder Produktion als Referenz mitgeschickt werden → ~80–95 %.

## Wichtige Implementierungs-Hinweise

- **Prisma/Storage nur dynamisch importieren** (`await import('#/db')`) innerhalb von Server-
  Function-Handlern. Statischer Top-Level-Import leakt Node-Code (`fileURLToPath`) ins
  Client-Bundle und crasht im Browser.
- **Server-Function-Rückgaben müssen serialisierbar sein** — keine `unknown`-Werte. Dafür
  `JsonObject`/DTOs (`src/lib/types.ts`) statt `Record<string, unknown>`.
- SQLite kennt keine Scalar-Arrays → Listen/Objekte liegen als `Json`-Spalten.
