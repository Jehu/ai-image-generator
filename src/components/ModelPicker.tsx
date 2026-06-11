import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAvailableModels } from '#/ipc/models'

/**
 * Dropdown zur Wahl des Bildmodells. Lädt die Modelle der Provider, deren
 * API-Key gesetzt ist, und rendert nur, wenn mehr als eines verfügbar ist —
 * andernfalls bleibt das implizite Default-Modell aktiv.
 */
export function ModelPicker({
  provider,
  modelId,
  onChange,
}: {
  provider: string
  modelId: string
  onChange: (provider: string, modelId: string) => void
}) {
  const { data: models = [] } = useQuery({
    queryKey: ['availableModels'],
    queryFn: () => listAvailableModels(),
  })

  // Auf das erste verfügbare Modell zurückfallen, wenn die aktuelle Auswahl
  // nicht (mehr) verfügbar ist — z.B. ein Stil mit gespeichertem OpenAI-Modell,
  // dessen Key fehlt.
  useEffect(() => {
    if (models.length === 0) return
    const exists = models.some(
      (m) => m.providerId === provider && m.modelId === modelId,
    )
    if (!exists) {
      onChange(models[0].providerId, models[0].modelId)
    }
  }, [models, provider, modelId, onChange])

  if (models.length <= 1) return null

  const value = `${provider}:${modelId}`

  return (
    <div>
      <label className="mb-1 block text-xs font-medium">Modell</label>
      <select
        value={value}
        onChange={(e) => {
          const sep = e.target.value.indexOf(':')
          onChange(e.target.value.slice(0, sep), e.target.value.slice(sep + 1))
        }}
        className="w-full rounded-md border bg-background p-2 text-sm"
      >
        {models.map((m) => (
          <option
            key={`${m.providerId}:${m.modelId}`}
            value={`${m.providerId}:${m.modelId}`}
          >
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
