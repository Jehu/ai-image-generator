// IPC-Adapter: ersetzt src/server/generate.ts (Signaturen unverändert).
import { invoke } from '@tauri-apps/api/core'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams, ReferenceImage } from '#/lib/providers/types'
import type { ImageKind } from '#/lib/kinds/types'

export interface GenerateInput {
  styleJson: JsonObject
  subject: string
  provider?: string
  modelId?: string
  params?: GenerateParams
  references?: Array<ReferenceImage>
  /** Bildart — steuert bildartspezifische Prompt-Hinweise (z.B. Text-Rendering). */
  kind?: ImageKind
  /** wenn gesetzt: Generierung wird in der Historie dieses Stils gespeichert */
  styleId?: string
}

export interface GenerateOutput {
  images: Array<{ dataUrl: string; mimeType: string }>
  compiledPrompt: JsonObject
  promptText: string
  costUsd: number
}

export async function generateImage(opts: {
  data: GenerateInput
}): Promise<GenerateOutput> {
  return invoke<GenerateOutput>('generate_image', { input: opts.data })
}
