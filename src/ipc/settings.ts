// IPC-Adapter: Settings lesen + OpenRouter-API-Key speichern.
// Der Key wird vom Rust-Backend in config.json (App-Data-Verzeichnis)
// abgelegt — er ist nie Teil der Anwendung oder des Frontend-Bundles.
import { invoke } from '@tauri-apps/api/core'

export interface SettingsInfo {
  hasOpenRouterKey: boolean
  openRouterKeyMasked: string | null
  /** Herkunft des wirksamen Keys: 'env' (Vorrang) | 'config' (UI) | null. */
  openRouterKeySource: 'env' | 'config' | null
  configPath: string
  imageDir: string
  databaseUrl: string
}

export async function getSettingsInfo(): Promise<SettingsInfo> {
  return invoke<SettingsInfo>('get_settings_info')
}

/** Key speichern; leerer String entfernt den gespeicherten Key. */
export async function saveSettings(opts: {
  data: { openrouterApiKey: string }
}): Promise<SettingsInfo> {
  return invoke<SettingsInfo>('save_settings', { input: opts.data })
}
