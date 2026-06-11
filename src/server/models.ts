import { createServerFn } from '@tanstack/react-start'
import { providers } from '#/lib/providers'

export interface AvailableModel {
  providerId: string
  modelId: string
  label: string
  supportsReferences: boolean
}

/** Liefert alle Modelle der Provider, deren API-Key gesetzt ist. Die UI nutzt
 *  das, um die Modellauswahl zu füllen (und sie zu verbergen, wenn nur ein
 *  Modell verfügbar ist). */
export const listAvailableModels = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<AvailableModel>> => {
    const out: Array<AvailableModel> = []
    for (const provider of Object.values(providers)) {
      const key = process.env[provider.apiKeyEnv]
      if (!key || key.trim() === '') continue
      for (const model of provider.models) {
        out.push({
          providerId: provider.id,
          modelId: model.id,
          label: model.label,
          supportsReferences: model.supportsReferences,
        })
      }
    }
    return out
  },
)
