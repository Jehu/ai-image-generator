// IPC-Adapter: ersetzt die client-aufrufbare Server Function aus
// src/server/styleBrief.ts (manuelle Brief-Neugenerierung).
import { invoke } from '@tauri-apps/api/core'
import type { JsonObject } from '#/lib/json'
import type { ImageKind } from '#/lib/kinds/types'

export interface CompileStyleBriefInput {
  styleJson: JsonObject
  kind?: ImageKind
}

export interface CompileStyleBriefResult {
  brief: string
}

export async function compileStyleBrief(opts: {
  data: CompileStyleBriefInput
}): Promise<CompileStyleBriefResult> {
  return invoke<CompileStyleBriefResult>('compile_style_brief', {
    input: opts.data,
  })
}
