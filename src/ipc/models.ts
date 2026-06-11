// IPC-Adapter: ersetzt src/server/models.ts (Signaturen unverändert).
import { invoke } from '@tauri-apps/api/core'

export interface AvailableModel {
  providerId: string
  modelId: string
  label: string
  supportsReferences: boolean
}

export async function listAvailableModels(): Promise<Array<AvailableModel>> {
  return invoke<Array<AvailableModel>>('list_available_models')
}
