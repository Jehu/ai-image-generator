import { createServerFn } from '@tanstack/react-start'

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

function maskKey(key: string): string | null {
  if (key.length === 0) return null
  return `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} Zeichen)`
}

/** Liest serverseitige Konfiguration (API-Keys werden nie im Klartext gesendet). */
export const getSettingsInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SettingsInfo> => {
    const key = process.env.GEMINI_API_KEY ?? ''
    const openAiKey = process.env.OPENAI_API_KEY ?? ''
    const openRouterKey = process.env.OPENROUTER_API_KEY ?? ''
    return {
      hasApiKey: key.trim().length > 0,
      apiKeyMasked: maskKey(key),
      hasOpenAiKey: openAiKey.trim().length > 0,
      openAiKeyMasked: maskKey(openAiKey),
      hasOpenRouterKey: openRouterKey.trim().length > 0,
      openRouterKeyMasked: maskKey(openRouterKey),
      imageDir: process.env.IMAGE_DIR ?? 'data/images',
      databaseUrl: (process.env.DATABASE_URL ?? 'file:./prisma/data/dev.db').replace(
        /(:\/\/[^:]+:)[^@]+(@)/,
        '$1***$2',
      ),
    }
  },
)
