// Bildart "Foto" — montiert aus dem bestehenden Foto-Material (Schema, Felder,
// Taxonomie, Presets). Diese Module bleiben die Single Source of Truth für den
// Fotostil; die Registry bündelt sie nur in die KindDef-Form.
import { GROUPS, TOP_FIELDS } from '#/lib/schema/fields'
import { validatePhotoStyle } from '#/lib/schema/photoStyle'
import { PRESET_CATEGORIES, STYLE_PRESETS } from '#/lib/presets'
import type { JsonObject } from '#/lib/json'
import type { KindDef, TopFieldDef } from './types'

// Start-Stil im Playground beim Wechsel auf "Foto".
const defaultStyle: JsonObject = {
  type: 'photographic',
  camera: { lens_mm: 35, aperture: 'f/2.0' },
  lighting: {
    setup: 'soft window light',
    quality: 'soft, diffused',
    color_temperature_k: 5200,
  },
  color: {
    film_emulation: 'Kodak Portra 400',
    grade: 'lifted shadows, muted saturation',
    temperature: 'warm',
  },
  post_processing: { grain: 'fine, subtle' },
  composition: { framing: 'medium', rule_of_thirds: true },
  mood: 'calm, editorial, premium',
  negative: 'no HDR look, no oversaturation, no harsh shadows',
}

const topFields: Array<TopFieldDef> = [
  { key: 'mood', ...TOP_FIELDS.mood },
  { key: 'negative', ...TOP_FIELDS.negative },
]

export const fotoKind: KindDef = {
  kind: 'foto',
  label: 'Foto',
  description:
    'Fotorealistisch — Kamera, Optik, Licht, Color-Grade, Film-Emulation.',
  groups: GROUPS,
  topFields,
  defaultStyle,
  exampleSubject: 'a ceramic coffee cup on a wooden desk next to a laptop',
  presets: STYLE_PRESETS,
  presetCategories: [...PRESET_CATEGORIES],
  dynamicOptionKeys: ['body'],
  validate: validatePhotoStyle,
}
