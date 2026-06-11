// IPC-Adapter: ersetzt src/server/styles.ts (Signaturen unverändert).
import { invoke } from '@tauri-apps/api/core'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams } from '#/lib/providers/types'
import type { ImageKind } from '#/lib/kinds/types'
import type { GenerationDTO, StyleDTO, StyleVersionDTO } from '#/lib/types'

export interface CreateStyleInput {
  name: string
  description?: string
  kind?: ImageKind
  tags?: Array<string>
  styleJson: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
  provider?: string
  modelId?: string
}

export interface UpdateStyleInput {
  id: string
  name?: string
  description?: string | null
  kind?: ImageKind
  tags?: Array<string>
  styleJson?: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
  provider?: string
  modelId?: string
}

export async function listStyles(opts?: {
  data?: { tag?: string; search?: string }
}): Promise<Array<StyleDTO>> {
  return invoke<Array<StyleDTO>>('list_styles', { input: opts?.data ?? {} })
}

export async function getStyle(opts: {
  data: { id: string }
}): Promise<StyleDTO | null> {
  return invoke<StyleDTO | null>('get_style', { input: opts.data })
}

export async function createStyle(opts: {
  data: CreateStyleInput
}): Promise<StyleDTO> {
  return invoke<StyleDTO>('create_style', { input: opts.data })
}

export async function updateStyle(opts: {
  data: UpdateStyleInput
}): Promise<StyleDTO> {
  return invoke<StyleDTO>('update_style', { input: opts.data })
}

export async function deleteStyle(opts: {
  data: { id: string }
}): Promise<{ id: string }> {
  return invoke<{ id: string }>('delete_style', { input: opts.data })
}

export async function duplicateStyle(opts: {
  data: { id: string }
}): Promise<StyleDTO> {
  return invoke<StyleDTO>('duplicate_style', { input: opts.data })
}

export async function listStyleVersions(opts: {
  data: { styleId: string }
}): Promise<Array<StyleVersionDTO>> {
  return invoke<Array<StyleVersionDTO>>('list_style_versions', {
    input: opts.data,
  })
}

export async function listGenerations(opts?: {
  data?: { styleId?: string; limit?: number }
}): Promise<Array<GenerationDTO>> {
  return invoke<Array<GenerationDTO>>('list_generations', {
    input: opts?.data ?? {},
  })
}
