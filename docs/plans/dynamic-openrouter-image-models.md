---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: user-request
---

# Dynamic OpenRouter Image Models

## Goal Capsule

Replace the fixed OpenRouter image-model registry with capability-aware runtime discovery, and use OpenRouter's dedicated Image API for generation. A model no longer listed by OpenRouter must remain selected visibly until the user chooses a replacement.

## Scope Boundaries

- OpenRouter remains the sole generation provider.
- No model configuration is persisted locally beyond existing styles and generations.
- Style-analysis and style-brief model configuration are unchanged.

## Key Technical Decisions

1. **Use `GET /api/v1/images/models` as the model source.** It returns only image-capable models plus `supported_parameters`; the generic `/models` endpoint remains pricing-only.
2. **Use a six-hour, in-memory capability cache.** This matches the existing pricing TTL and preserves the last successful result during transient discovery failures.
3. **Use `POST /api/v1/images` for generation.** The request and response are aligned with the runtime model API: `prompt`, `input_references`, `resolution`, `aspect_ratio`, and `data[*].b64_json`.
4. **Preserve unavailable model IDs in the picker.** Automatic fallback would silently mutate the model used by an existing style.

## Requirements Traceability

- R1: The model picker receives current image-capable models from OpenRouter without a code release.
- R2: Model-specific reference, resolution, aspect-ratio, and output-count capabilities constrain requests.
- R3: Image generation uses OpenRouter's dedicated Image API and persists returned image MIME/data and cost.
- R4: A persisted model unavailable in the refreshed catalog remains visible and selected until explicitly changed.
- R5: Network failure during refresh uses an existing successful in-memory catalog; a first-load failure is surfaced.

## Implementation Units

### U1. Dynamic capability discovery

**Files:** `src-tauri/src/provider.rs`, `src-tauri/src/state.rs`, `src-tauri/src/dto.rs`, `src-tauri/src/commands/misc.rs`, `src/ipc/models.ts`

- Define owned image-model capability descriptors from the `/images/models` response.
- Add a six-hour async cache in application state.
- Map endpoint fields into the mirrored Rust/TypeScript model DTO.
- Return discovery results through the existing `list_available_models` IPC path.

**Test scenarios:**
- Parsing accepts a model with reference, resolution, aspect-ratio, and count limits.
- Missing optional supported parameters produce safe defaults.
- Cached results are returned while fresh.

### U2. Capability-aware Image API generation

**Files:** `src-tauri/src/provider.rs`, `src-tauri/src/commands/generate.rs`

- Resolve the selected model against fetched capabilities before generating.
- Send model-supported request fields to `POST /api/v1/images`; omit unsupported fields.
- Encode input references as data URLs in `input_references` only when supported.
- Decode every returned `b64_json` with its `media_type`, and retain usage cost.

**Test scenarios:**
- A compatible request serializes image API fields and reference data correctly.
- Unsupported optional parameters are omitted.
- Successful image API response converts buffered image data and cost.
- An unavailable model produces a clear error.

### U3. Non-destructive picker behavior

**Files:** `src/components/ModelPicker.tsx`

- Remove automatic fallback for a missing currently selected model.
- Render the missing selection as an unavailable option so a style's model remains inspectable.

**Test scenarios:**
- A refreshed catalog without the selected model does not invoke `onChange`.
- Selecting a listed model still emits provider and model ID.

## Verification Contract

- Rust unit tests cover model parsing, request construction, response parsing, cache behavior, and unavailable-model errors.
- Frontend tests cover unavailable-picker preservation.
- `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, `npx tsc --noEmit`, and `npm run lint` pass.

## Definition of Done

R1–R5 hold, hardcoded image model descriptors are removed, no stale-model picker mutation remains, and all verification-contract commands pass.
