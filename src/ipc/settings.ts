// IPC-Adapter: ersetzt die TanStack-Server-Function aus src/server/settings.ts.
// Gleiche Signatur/DTOs wie zuvor — intern ruft Tauri `invoke` das Rust-Backend.
import { invoke } from '@tauri-apps/api/core'

export interface SettingsInfo {
  hasApiKey: boolean
  apiKeyMasked: string | null
  hasOpenAiKey: boolean
  openAiKeyMasked: string | null
  hasOpenRouterKey: boolean
  openRouterKeyMasked: string | null
  imageDir: string
  databaseUrl: string
}

export async function getSettingsInfo(): Promise<SettingsInfo> {
  return invoke<SettingsInfo>('get_settings_info')
}
