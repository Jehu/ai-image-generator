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
  onAvailabilityChange,
}: {
  provider: string
  modelId: string
  onChange: (provider: string, modelId: string) => void
  onAvailabilityChange?: (available: boolean) => void
}) {
  const { data: models = [] } = useQuery({
    queryKey: ['availableModels'],
    queryFn: () => listAvailableModels(),
  })
  const selectedUnavailable =
    models.length > 0 &&
    !models.some(
      (model) => model.providerId === provider && model.modelId === modelId,
    )
  useEffect(() => {
    if (!modelId && models.length > 0) {
      onChange(models[0].providerId, models[0].modelId)
    }
  }, [modelId, models, onChange])
  useEffect(() => {
    onAvailabilityChange?.(!selectedUnavailable)
  }, [onAvailabilityChange, selectedUnavailable])

  if (models.length <= 1 && !selectedUnavailable) return null

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
        {selectedUnavailable && (
          <option value={value}>
            Aktuelles Modell nicht mehr verfügbar: {modelId}
          </option>
        )}
        {models.map((m) => (
          <option
            key={`${m.providerId}:${m.modelId}`}
            value={`${m.providerId}:${m.modelId}`}
          >
            {m.label}
          </option>
        ))}
      </select>
      {selectedUnavailable && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          Wähle ein anderes Modell, bevor du generierst.
        </p>
      )}
    </div>
  )
}
