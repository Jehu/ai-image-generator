// Serialisierbare DTOs für Server-Function-Grenzen (keine Date/Prisma-Typen,
// keine `unknown`-Werte — sonst lehnt TanStack Start die Serialisierung ab).
import type { JsonObject } from './json'
import type { GenerateParams } from './providers/types'
import type { ImageKind } from './kinds/types'

export interface StyleDTO {
  id: string
  name: string
  description: string | null
  kind: ImageKind
  tags: Array<string>
  styleJson: JsonObject
  /** LLM-generierter Markdown-Style-Brief (Prosa); null wenn (noch) keiner erzeugt wurde. */
  styleBrief: string | null
  schemaVersion: number
  version: number
  provider: string
  modelId: string
  defaultParams: GenerateParams
  anchorImageIds: Array<string>
  createdAt: string
  updatedAt: string
}

export interface StyleVersionDTO {
  version: number
  styleJson: JsonObject
  createdAt: string
}

export interface GenerationDTO {
  id: string
  styleId: string | null
  subject: string
  promptText: string
  provider: string
  modelId: string
  params: GenerateParams
  status: string
  errorMessage: string | null
  costUsd: number | null
  outputImageIds: Array<string>
  createdAt: string
}
