// Bildart-Registry. Zentrale Stelle, an der alle ImageKinds zusammenlaufen.
// StyleEditor, PresetPicker und Routen rendern generisch aus `getKind(kind)`.
import { fotoKind } from './foto'
import { illustrationKind } from './illustration'
import { infografikKind } from './infografik'
import { asImageKind, IMAGE_KINDS } from './types'
import type { ImageKind, KindDef } from './types'

export type { ImageKind, KindDef, TopFieldDef, ValidationResult } from './types'
export { IMAGE_KINDS, DEFAULT_KIND, asImageKind } from './types'

export const KINDS: Record<ImageKind, KindDef> = {
  foto: fotoKind,
  illustration: illustrationKind,
  infografik: infografikKind,
}

/** Liefert das KindDef; unbekannte/fehlende Werte fallen auf Foto zurück. */
export function getKind(kind: unknown): KindDef {
  return KINDS[asImageKind(kind)]
}

/** Bildarten in fester Reihenfolge (für Segmented Control etc.). */
export const KIND_LIST: Array<KindDef> = IMAGE_KINDS.map((k) => KINDS[k])
