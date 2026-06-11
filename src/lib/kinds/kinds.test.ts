import { describe, expect, it } from 'vitest'
import { getKind, KINDS, KIND_LIST, IMAGE_KINDS, asImageKind } from './index'

describe('Bildart-Registry', () => {
  it('enthält alle ImageKinds', () => {
    for (const k of IMAGE_KINDS) {
      expect(KINDS[k]).toBeDefined()
      expect(KINDS[k].kind).toBe(k)
    }
    expect(KIND_LIST).toHaveLength(IMAGE_KINDS.length)
  })

  it('jeder Default-Stil validiert gegen das eigene Schema', () => {
    for (const def of KIND_LIST) {
      const res = def.validate(def.defaultStyle)
      expect(res.ok, `${def.kind}: ${res.issues.join(', ')}`).toBe(true)
    }
  })

  it('jeder Preset-Stil validiert gegen das Schema seiner Bildart', () => {
    for (const def of KIND_LIST) {
      for (const preset of def.presets) {
        const res = def.validate(preset.styleJson)
        expect(res.ok, `${def.kind}/${preset.id}: ${res.issues.join(', ')}`).toBe(
          true,
        )
      }
    }
  })

  it('Preset-Kategorien decken alle Presets ab', () => {
    for (const def of KIND_LIST) {
      for (const preset of def.presets) {
        expect(
          def.presetCategories,
          `${def.kind}/${preset.id} hat unbekannte Kategorie ${preset.category}`,
        ).toContain(preset.category)
      }
    }
  })

  it('asImageKind fällt auf foto zurück', () => {
    expect(asImageKind('illustration')).toBe('illustration')
    expect(asImageKind('quatsch')).toBe('foto')
    expect(asImageKind(undefined)).toBe('foto')
    expect(getKind('quatsch').kind).toBe('foto')
  })
})
