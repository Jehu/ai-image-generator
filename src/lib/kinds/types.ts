// Bildart-Registry: gemeinsame Typen + Helfer.
// Eine "Bildart" (ImageKind) bündelt Schema, Formular-Gruppen, Default-Stil,
// Presets und Validierung. Der StyleEditor/PresetPicker rendern generisch aus
// dem KindDef der aktiven Bildart, statt das Foto-Schema hart zu verdrahten.
import type { z } from 'zod'
import type { JsonObject } from '#/lib/json'
import type { GroupDef } from '#/lib/schema/fields'
import type { StylePreset } from '#/lib/presets'
import type { ValidationResult } from '#/lib/schema/photoStyle'

export type { ValidationResult }

export type ImageKind = 'foto' | 'illustration' | 'infografik'

export const IMAGE_KINDS: ReadonlyArray<ImageKind> = [
  'foto',
  'illustration',
  'infografik',
]

export const DEFAULT_KIND: ImageKind = 'foto'

/** Top-Level-Feld (außerhalb der Gruppen), z. B. mood / negative. */
export interface TopFieldDef {
  key: string
  label: string
  options?: ReadonlyArray<string>
  placeholder?: string
  help?: string
}

export interface KindDef {
  kind: ImageKind
  /** Anzeigename (Segmented Control, Badges). */
  label: string
  /** Kurzbeschreibung für UI-Hinweise. */
  description: string
  /** Formular-Gruppen (oberste Blöcke im Stil-JSON). */
  groups: Array<GroupDef>
  /** Top-Level-Felder (mood, negative …). */
  topFields: Array<TopFieldDef>
  /** Start-Stil beim Wechsel auf diese Bildart. */
  defaultStyle: JsonObject
  /** Beispiel-Motiv (subject), das zu dieser Bildart passt. */
  exampleSubject: string
  presets: Array<StylePreset>
  presetCategories: Array<string>
  /** Feld-Keys, die zur Laufzeit dynamische Optionen erhalten (Foto: 'body'). */
  dynamicOptionKeys: Array<string>
  /** Validiert ein Stil-JSON tolerant gegen das Schema dieser Bildart. */
  validate: (value: unknown) => ValidationResult
}

/** Baut aus einem Zod-Schema die `validate`-Funktion (gleiche Form wie validatePhotoStyle). */
export function makeValidator(
  schema: z.ZodType,
): (value: unknown) => ValidationResult {
  return (value: unknown): ValidationResult => {
    const result = schema.safeParse(value)
    if (result.success) return { ok: true, issues: [] }
    return {
      ok: false,
      issues: result.error.issues.map((i) => {
        const path = i.path.join('.') || '(root)'
        return `${path}: ${i.message}`
      }),
    }
  }
}

/** Coerce beliebiger Strings auf eine gültige ImageKind (Fallback: foto). */
export function asImageKind(value: unknown): ImageKind {
  return IMAGE_KINDS.includes(value as ImageKind)
    ? (value as ImageKind)
    : DEFAULT_KIND
}
