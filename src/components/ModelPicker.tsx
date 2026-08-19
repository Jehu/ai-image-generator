import { useEffect, useState } from 'react'
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
  const groupedModels = Object.entries(
    models.reduce<Record<string, typeof models>>((groups, model) => {
      ;(groups[model.providerId] ??= []).push(model)
      return groups
    }, {}),
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([providerId, providerModels]) =>
        [
          providerId,
          providerModels.sort((left, right) =>
            left.label.localeCompare(right.label),
          ),
        ] as const,
    )
  const sortedModels = groupedModels.flatMap(
    ([, providerModels]) => providerModels,
  )
  const [query, setQuery] = useState('')
  const selectedUnavailable =
    models.length > 0 &&
    !models.some(
      (model) => model.providerId === provider && model.modelId === modelId,
    )
  const modelLabel = (model: (typeof models)[number]) =>
    `${model.providerId === 'openrouter' ? 'OpenRouter' : model.providerId === 'venice' ? 'Venice' : model.providerId} — ${model.label}${model.supportsStyleReferences ? ' · Stil-Anker' : ''}`
  const selectedModel = models.find(
    (model) => model.providerId === provider && model.modelId === modelId,
  )
  useEffect(() => {
    if (!modelId && sortedModels.length > 0) {
      onChange(sortedModels[0].providerId, sortedModels[0].modelId)
    }
  }, [modelId, onChange, sortedModels])
  useEffect(() => {
    const selected = models.find(
      (model) => model.providerId === provider && model.modelId === modelId,
    )
    if (selected) setQuery(modelLabel(selected))
  }, [modelId, models, provider])
  useEffect(() => {
    onAvailabilityChange?.(!selectedUnavailable)
  }, [onAvailabilityChange, selectedUnavailable])

  if (models.length <= 1 && !selectedUnavailable) return null
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">Modell</label>
      <input
        type="search"
        list="model-options"
        value={query}
        onChange={(event) => {
          const value = event.target.value
          setQuery(value)
          const selected = sortedModels.find(
            (model) => modelLabel(model) === value,
          )
          if (selected) onChange(selected.providerId, selected.modelId)
        }}
        placeholder="Modell suchen…"
        className="w-full rounded-md border bg-background p-2 text-sm"
      />
      <datalist id="model-options">
        {sortedModels.map((model) => (
          <option
            key={`${model.providerId}:${model.modelId}`}
            value={modelLabel(model)}
          />
        ))}
      </datalist>
      {selectedModel && (
        <p className="text-muted-foreground mt-1 text-xs">
          Stil-Anker:{' '}
          {selectedModel.supportsStyleReferences
            ? 'unterstützt'
            : 'nicht unterstützt'}
        </p>
      )}
      {selectedUnavailable && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          Aktuelles Modell nicht mehr verfügbar: {modelId}. Wähle ein anderes
          Modell, bevor du generierst.
        </p>
      )}
    </div>
  )
}
