import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getKind } from '#/lib/kinds'
import type { ImageKind } from '#/lib/kinds'
import type { StylePreset } from '#/lib/presets'

/** Dropdown mit kuratierten Stil-Vorlagen der aktiven Bildart, gruppiert nach
 *  Kategorie. Auswahl füllt das Formular vor (einmalige Aktion). */
export function PresetPicker({
  onApply,
  kind = 'foto',
}: {
  onApply: (preset: StylePreset) => void
  kind?: ImageKind
}) {
  const [applied, setApplied] = useState<StylePreset | null>(null)
  const def = getKind(kind)

  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-sm font-medium">
        <Sparkles className="h-4 w-4" />
        Stil-Vorlage
      </label>
      <select
        value=""
        onChange={(e) => {
          const preset = def.presets.find((p) => p.id === e.target.value)
          if (preset) {
            onApply(preset)
            setApplied(preset)
          }
        }}
        className="w-full rounded-md border bg-background p-2 text-sm"
      >
        <option value="">— Vorlage wählen (füllt das Formular) —</option>
        {def.presetCategories.map((cat) => (
          <optgroup key={cat} label={cat}>
            {def.presets.filter((p) => p.category === cat).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {applied && (
        <p className="text-muted-foreground mt-1 text-xs">
          <span className="font-medium text-foreground">{applied.name}</span> —{' '}
          {applied.description} Werte unten frei anpassbar.
        </p>
      )}
    </div>
  )
}
