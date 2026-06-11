// Provider-Abstraktion: UI/Server rufen nur dieses Interface auf.
// Gemini-first; Imagen 4 (mit Seed) o.Ä. später ohne Aufrufer-Umbau einsteckbar.

export type ImageSize = '1K' | '2K' | '4K'

export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export type ThinkingLevelOpt = 'minimal' | 'low' | 'medium' | 'high'

export interface ReferenceImage {
  mimeType: string
  /** base64, ohne data:-Präfix */
  data: string
}

export interface GenerateParams {
  aspectRatio?: AspectRatio
  imageSize?: ImageSize
  thinkingLevel?: ThinkingLevelOpt
  /** Anzahl Varianten (separate Calls) */
  count?: number
}

export interface GenerateRequest {
  modelId: string
  /** kompilierter Prompt (Stil-JSON + subject) als String */
  promptText: string
  references?: Array<ReferenceImage>
  params?: GenerateParams
}

export interface GeneratedImage {
  /** base64, ohne data:-Präfix */
  data: string
  mimeType: string
}

export interface GenerateResult {
  images: Array<GeneratedImage>
  /** geschätzte Kosten in USD (Bildpreis × Anzahl; Token-Kosten vernachlässigt) */
  costUsd: number
}

export interface ModelDescriptor {
  id: string
  label: string
  maxReferenceImages: number
  supportsSeed: boolean
  /** ob das Modell Referenz-/Anker-Bilder zur Stil-Konsistenz nutzen kann */
  supportsReferences: boolean
  imageSizes: Array<ImageSize>
  aspectRatios: Array<AspectRatio>
}

export interface ImageProvider {
  id: string
  /** Name der Env-Variable mit dem API-Key; der Server prüft darüber, ob der
   *  Provider konfiguriert ist. */
  apiKeyEnv: string
  models: Array<ModelDescriptor>
  generate: (req: GenerateRequest) => Promise<GenerateResult>
}
