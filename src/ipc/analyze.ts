// IPC-Adapter: ersetzt src/server/analyze.ts (Signaturen unverändert).
// Das Rust-Backend macht den Vision-Call (über OpenRouter) und entfernt ein
// versehentlich gesetztes "subject". Die tolerante Schema-Validierung läuft
// hier clientseitig (Zod ist browser-sicher) — identisches Verhalten wie zuvor.
import { invoke } from '@tauri-apps/api/core'
import { validatePhotoStyle } from '#/lib/schema/photoStyle'
import type { JsonObject } from '#/lib/json'

export interface AnalyzeStyleInput {
  imageBase64: string
  mimeType: string
}

export interface AnalyzeStyleResult {
  styleJson: JsonObject
  warnings: Array<string>
}

export async function analyzeStyleFromImage(opts: {
  data: AnalyzeStyleInput
}): Promise<AnalyzeStyleResult> {
  const { styleJson } = await invoke<{ styleJson: JsonObject }>(
    'analyze_style_from_image',
    { input: opts.data },
  )
  const validation = validatePhotoStyle(styleJson)
  return {
    styleJson,
    warnings: validation.ok ? [] : validation.issues,
  }
}
