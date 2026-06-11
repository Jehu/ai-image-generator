import { z } from 'zod'

// Zod-Schema als Single Source of Truth für den Fotostil.
// - Alle Felder optional -> Stile können minimal oder hochdetailliert sein.
// - looseObject: unbekannte Keys bleiben erhalten (JSON-Tab als Escape-Hatch).

const camera = z.looseObject({
  body: z.string().optional(),
  lens_mm: z.number().optional(),
  aperture: z.string().optional(),
  iso: z.number().optional(),
  shutter_speed: z.string().optional(),
  format: z.string().optional(),
})

const optics = z.looseObject({
  depth_of_field: z.string().optional(),
  bokeh: z.string().optional(),
  vignette: z.string().optional(),
  lens_flare: z.boolean().optional(),
  chromatic_aberration: z.boolean().optional(),
})

const lighting = z.looseObject({
  setup: z.string().optional(),
  primary_source: z.string().optional(),
  direction: z.string().optional(),
  quality: z.string().optional(),
  color_temperature_k: z.number().optional(),
  fill_ratio: z.string().optional(),
})

const color = z.looseObject({
  palette: z.array(z.string()).optional(),
  temperature: z.string().optional(),
  saturation: z.string().optional(),
  grade: z.string().optional(),
  film_emulation: z.string().optional(),
  contrast: z.string().optional(),
})

const post_processing = z.looseObject({
  grain: z.string().optional(),
  halation: z.boolean().optional(),
  clarity: z.string().optional(),
  sharpening: z.string().optional(),
  finish: z.string().optional(),
})

const composition = z.looseObject({
  framing: z.string().optional(),
  angle: z.string().optional(),
  rule_of_thirds: z.boolean().optional(),
  negative_space: z.string().optional(),
})

export const photoStyleSchema = z.looseObject({
  type: z.string().optional(),
  camera: camera.optional(),
  optics: optics.optional(),
  lighting: lighting.optional(),
  color: color.optional(),
  post_processing: post_processing.optional(),
  composition: composition.optional(),
  mood: z.string().optional(),
  negative: z.string().optional(),
})

export type PhotoStyle = z.infer<typeof photoStyleSchema>

/** Struktur der Formular-Gruppen (treibt das Rendering des Formulars). */
export const STYLE_GROUPS = [
  'camera',
  'optics',
  'lighting',
  'color',
  'post_processing',
  'composition',
] as const

export type StyleGroup = (typeof STYLE_GROUPS)[number]

export interface ValidationResult {
  ok: boolean
  /** menschenlesbare Fehlermeldungen (Pfad + Problem) */
  issues: Array<string>
}

/** Validiert ein (bereits geparstes) JSON-Objekt gegen das Schema. */
export function validatePhotoStyle(value: unknown): ValidationResult {
  const result = photoStyleSchema.safeParse(value)
  if (result.success) return { ok: true, issues: [] }
  return {
    ok: false,
    issues: result.error.issues.map((i) => {
      const path = i.path.join('.') || '(root)'
      return `${path}: ${i.message}`
    }),
  }
}
