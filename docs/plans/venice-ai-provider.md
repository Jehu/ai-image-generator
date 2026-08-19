---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Venice.ai image provider

## Goal Capsule

Add Venice.ai as an optional image-generation provider without changing the existing OpenRouter generation or OpenRouter-backed analysis and style-brief flows. Persist `provider: "venice"` with selected Venice model IDs, and expose only the providers whose API key is configured.

## Scope Boundaries

- No provider plugin registry, dynamic loading, or trait-object framework.
- No Venice text/vision integration; analysis and style briefs remain on OpenRouter.
- No migration: existing `Style` and `Generation` provider/model fields already support a new provider value.
- No x402 wallet authentication; use Venice API keys only.

## Key Technical Decisions

1. Keep a small dispatcher in `src-tauri/src/provider.rs` and move provider-specific HTTP, model mapping, response parsing, and pricing into `openrouter` and `venice` modules. This isolates two real wire contracts without prebuilding an extension framework.
2. Normalize both providers into the existing internal `ImageModel` and `GenerateResult` types. The UI and persisted DTOs continue to use `providerId` and `modelId`.
3. Translate Venice runtime metadata from `model_spec.constraints` and pricing from `model_spec.pricing`; do not estimate a Venice cost when the selected parameter combination is absent.
4. Submit anchor images only to Venice models advertising `supportsStyleReferences`; encode them as `style_references` data URIs and cap by `maxStyleReferences`.

## Requirements

- R1: `VENICE_API_KEY` is read from environment or `config.json`, and is editable/masked in Settings with the same precedence rules as OpenRouter.
- R2: Model discovery combines configured OpenRouter and Venice image models, retaining their provider IDs.
- R3: Venice generation maps the app contract to `POST /api/v1/image/generate`: `count` to `variants`, image format to PNG, supported aspect ratio/resolution, and compatible anchor images to `style_references`.
- R4: Venice responses persist generated Base64 images and an exact model-derived USD cost where available.
- R5: Existing OpenRouter behavior and legacy Gemini model mapping remain unchanged.

## Implementation Units

### U1. Provider module boundary and Venice adapter

**Files:** `src-tauri/src/provider.rs`, `src-tauri/src/provider/openrouter.rs`, `src-tauri/src/provider/venice.rs`, `src-tauri/src/state.rs`.

Move the current OpenRouter implementation into a dedicated module without behavior changes. Add provider dispatch based on `openrouter` and `venice`; use separate model and price caches per provider. Implement Venice model discovery, request construction, response parsing, error mapping, and parameter-specific pricing.

**Test scenarios:** Venice metadata maps constraints, style-reference limits, resolution/aspect ratio, and fixed prices; Venice requests use `variants` and style-reference data URIs; Venice image arrays normalize to generated images; OpenRouter mapping remains unchanged.

### U2. Provider selection and command integration

**Files:** `src-tauri/src/commands/generate.rs`, `src-tauri/src/commands/misc.rs`, `src-tauri/src/dto.rs` if provider-aware model metadata requires it.

Resolve and dispatch the persisted provider during generation. Combine model inventories for configured providers. Keep unavailable persisted selections and existing OpenRouter defaults intact.

**Test scenarios:** a Venice selection resolves; unsupported providers return a localized actionable error; model lists contain configured providers only.

### U3. Venice credentials and Settings UI

**Files:** `src-tauri/src/config.rs`, `src-tauri/src/commands/misc.rs`, `src/ipc/settings.ts`, `src/routes/settings.tsx`.

Add Venice key configuration with independent masked value and source fields. Update the Settings API and render a second API-key section reusing existing UI patterns.

**Test scenarios:** environment and persisted Venice keys follow precedence; saving an empty Venice key deletes only the persisted Venice key; Settings renders and saves Venice keys without changing OpenRouter behavior.

### U4. Regression coverage and verification

**Files:** provider and settings test modules; `src/components/ModelPicker.test.tsx` only if provider grouping changes its observable behavior.

Test first for each changed contract. Run targeted Rust and frontend tests, then typecheck, lint, frontend build, and Rust tests.

## Verification Contract

- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm test -- --run`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Definition of Done

A user can add a Venice API key, choose a discovered Venice image model, generate and persist an image through Venice, and retain OpenRouter generation unchanged. Venice references are submitted only when the selected model advertises support; cost history is never fabricated.
