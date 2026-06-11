import { describe, expect, it } from 'vitest'
import {
  formatList,
  parseList,
  setGroupField,
  setTop,
} from './styleObject'

describe('styleObject', () => {
  it('setzt und entfernt verschachtelte Felder', () => {
    let obj = setGroupField({}, 'camera', 'lens_mm', 35)
    expect(obj).toEqual({ camera: { lens_mm: 35 } })

    obj = setGroupField(obj, 'camera', 'aperture', 'f/2.0')
    expect(obj).toEqual({ camera: { lens_mm: 35, aperture: 'f/2.0' } })

    // leeren Wert -> Key weg
    obj = setGroupField(obj, 'camera', 'aperture', '')
    expect(obj).toEqual({ camera: { lens_mm: 35 } })

    // letztes Feld entfernen -> Gruppe weg
    obj = setGroupField(obj, 'camera', 'lens_mm', undefined)
    expect(obj).toEqual({})
  })

  it('setTop entfernt bei leerem Wert', () => {
    expect(setTop({ mood: 'x' }, 'mood', '')).toEqual({})
    expect(setTop({}, 'mood', 'calm')).toEqual({ mood: 'calm' })
  })

  it('parseList / formatList', () => {
    expect(parseList('#aaa, #bbb ,')).toEqual(['#aaa', '#bbb'])
    expect(formatList(['#aaa', '#bbb'])).toBe('#aaa, #bbb')
    expect(formatList(undefined)).toBe('')
  })
})
