# AGENTS.md — src/lib/providers/

## Purpose

Provider-Abstraktion für KI-Bildgenerierung. Definiert das `ImageProvider`-Interface und registriert konkrete Implementierungen. Neue Provider (Imagen, GPT-Image, …) können hinzugefügt werden, ohne Aufrufer anzupassen.

## Ownership

`types.ts`, `index.ts`, `gemini.ts` und künftige Provider-Dateien.

## Local Contracts

### Interface-Vertrag (`types.ts`)

Jeder Provider implementiert `ImageProvider`:
```ts
interface ImageProvider {
  id: string
  apiKeyEnv: string            // Name der Env-Variable mit dem API-Key
  models: Array<ModelDescriptor>
  generate(req: GenerateRequest): Promise<GenerateResult>
}
```

- `GenerateRequest.promptText` ist der fertig kompilierte Text aus `compilePrompt()`.
- `GenerateRequest.references` enthält Base64-Bilder ohne `data:`-Präfix.
- `GenerateResult.costUsd` ist eine Schätzung (Bildpreis × Anzahl); Token-Overhead wird vernachlässigt.
- `apiKeyEnv` ist die einzige Stelle, an der ein Provider seinen Key bekanntgibt. `listAvailableModels` (`src/server/models.ts`) prüft darüber, welche Provider konfiguriert sind, und füllt die UI-Modellauswahl.
- `ModelDescriptor.supportsReferences` steuert, ob Anker-/Referenzbilder genutzt werden.

### Registrierung (`index.ts`)

Neue Provider in `PROVIDERS`-Record eintragen; `getProvider(id)` wirft bei unbekannter ID.

### Gemini-Besonderheiten (`gemini.ts`)

- `gemini-3-pro-image` liefert **pro API-Call genau 1 Bild** → N Varianten = N parallele Calls.
- **Keine Seed-Unterstützung** (`supportsSeed: false`) — Konsistenz nur über Referenzbilder.
- Preistabelle (`PRICE_PER_IMAGE`) bei Preisänderungen hier aktualisieren.
- `GEMINI_API_KEY` aus `process.env` — nie hardcoden.

### OpenAI-Besonderheiten (`openai.ts`)

- Modelle: `gpt-image-1` (feste Pro-Bild-Preise, Anker via `images.edit`) und `gpt-image-2`
  (`supportsReferences: false`, token-basiert → Kosten nur grob geschätzt).
- `images.generate` liefert mehrere Bilder pro Call (`n`); mit Ankern wird `images.edit`
  genutzt (`input_fidelity: 'high'`).
- Param-Mapping Gemini→OpenAI: `aspectRatio`→`size` (1024er-Varianten), `imageSize`→`quality`,
  `thinkingLevel` entfällt. Preistabellen (`PRICE_GPT_IMAGE_1/2`) bei Änderungen hier pflegen.
- `OPENAI_API_KEY` aus `process.env`.

### OpenRouter-Besonderheiten (`openrouter.ts`)

- Spricht den OpenAI-kompatiblen Chat-Completions-Endpoint über **raw `fetch`** an (nicht das
  `openai`-SDK): `modalities: ["image","text"]`, optional `image_config`, Bild kommt in
  `choices[0].message.images[0].image_url.url` (data-URL) zurück, `usage.cost` via `usage:{include:true}`.
- Modellliste ist **kuratiert** (verifiziert gegen `GET /api/v1/models`): drei Nano-Banana-Generationen
  (`google/gemini-3-pro-image-preview`, `…3.1-flash-image-preview`, `…2.5-flash-image`) plus
  `openai/gpt-5-image` und `openai/gpt-5-image-mini`. Bild-Output-Modelle ändern sich häufig — neue IDs
  gegen `/models` (`architecture.output_modalities` enthält `image`) prüfen, bevor du sie aufnimmst.
- `image_config` (aspect_ratio/image_size) wird **nur an Gemini-Modelle** geschickt (`supportsImageConfig`);
  OpenAI-Modelle ignorieren es. Kein Modell exponiert Seeds (`supportsSeed: false`).
- Referenz-/Ankerbilder gehen als `image_url`-content-parts mit data-URL in die user-message — nur bei
  `supportsReferences`-Modellen.
- **Kosten:** primär `usage.cost` (tatsächlich). Fallback = Live-Pro-Bild-Preis aus `/models`
  (In-Memory-Cache, 6 h TTL) × Bildanzahl, wenn `usage.cost` fehlt.
- N Varianten = N parallele Calls (Image-Modality liefert 1 Bild pro Call), analog Gemini.
- `OPENROUTER_API_KEY` aus `process.env`; optionale Header `OPENROUTER_HTTP_REFERER`/`OPENROUTER_APP_TITLE`.

## Work Guidance

Neuen Provider anlegen:
1. Datei `src/lib/providers/<name>.ts` mit `ImageProvider`-Implementierung erstellen (inkl. `apiKeyEnv`).
2. In `src/lib/providers/index.ts` unter neuem Key registrieren.
3. `ModelDescriptor` korrekt befüllen (`maxReferenceImages`, `supportsSeed`, `supportsReferences`, `imageSizes`, `aspectRatios`).
4. Sobald der Key gesetzt ist, erscheinen die Modelle automatisch in der UI-Auswahl (`ModelPicker` ⇄ `listAvailableModels`).
