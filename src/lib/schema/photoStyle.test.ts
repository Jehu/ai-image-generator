import { describe, expect, it } from 'vitest'
import { photoStyleSchema, validatePhotoStyle } from './photoStyle'

describe('photoStyleSchema', () => {
  it('akzeptiert ein minimales gültiges Objekt', () => {
    expect(validatePhotoStyle({ mood: 'calm' }).ok).toBe(true)
  })

  it('meldet falsche Typen', () => {
    const res = validatePhotoStyle({ camera: { lens_mm: 'fünfunddreißig' } })
    expect(res.ok).toBe(false)
    expect(res.issues.join(' ')).toMatch(/camera.lens_mm/)
  })

  it('behält unbekannte Keys (Escape-Hatch)', () => {
    const parsed = photoStyleSchema.parse({ mood: 'calm', custom_x: 42 })
    expect((parsed as Record<string, unknown>).custom_x).toBe(42)
  })
})
