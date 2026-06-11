import { describe, expect, it } from 'vitest'
import { canonicalStringify } from './canonicalJson'

describe('canonicalStringify', () => {
  it('ergibt für key-permutierte Objekte denselben String', () => {
    const a = canonicalStringify({ b: 1, a: 2 })
    const b = canonicalStringify({ a: 2, b: 1 })
    expect(a).toBe(b)
  })

  it('sortiert auch verschachtelte Objekt-Keys', () => {
    const a = canonicalStringify({ outer: { y: 1, x: 2 }, first: true })
    const b = canonicalStringify({ first: true, outer: { x: 2, y: 1 } })
    expect(a).toBe(b)
  })

  it('bewahrt die Array-Reihenfolge (kein Sortieren von Arrays)', () => {
    expect(canonicalStringify([3, 1, 2])).not.toBe(canonicalStringify([1, 2, 3]))
    expect(canonicalStringify(['#fff', '#000'])).toBe('["#fff","#000"]')
  })

  it('unterscheidet inhaltlich verschiedene Stile', () => {
    expect(canonicalStringify({ a: 1 })).not.toBe(canonicalStringify({ a: 2 }))
  })

  it('behandelt Primitive und null', () => {
    expect(canonicalStringify(null)).toBe('null')
    expect(canonicalStringify('x')).toBe('"x"')
    expect(canonicalStringify(5)).toBe('5')
    expect(canonicalStringify(true)).toBe('true')
  })
})
