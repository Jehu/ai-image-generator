import { describe, expect, it } from 'vitest'
import { readStyleImport, slugify } from './export'

describe('slugify', () => {
  it('normalisiert Namen zu URL-tauglichen Slugs', () => {
    expect(slugify('Mein Cooler Stil!')).toBe('mein-cooler-stil')
    expect(slugify('Blog Featured – Editorial Warm')).toBe(
      'blog-featured-editorial-warm',
    )
  })

  it('entfernt Diakritika (ß wird als Sonderzeichen verworfen, kein "ss")', () => {
    expect(slugify('Über Grün & Weiß')).toBe('uber-grun-wei')
    expect(slugify('Café Naïve')).toBe('cafe-naive')
  })

  it('trimmt führende/abschließende Trenner und fasst Mehrfach-Trenner zusammen', () => {
    expect(slugify('  --Hallo___Welt--  ')).toBe('hallo-welt')
  })

  it('fällt bei leerem Ergebnis auf "export" zurück', () => {
    expect(slugify('')).toBe('export')
    expect(slugify('!!!')).toBe('export')
  })
})

describe('readStyleImport', () => {
  const asFile = (content: string) =>
    new File([content], 'style.json', { type: 'application/json' })

  it('liest und validiert eine gültige Stil-Datei', async () => {
    const json = JSON.stringify({
      name: 'Test-Stil',
      tags: ['a', 'b'],
      styleJson: { camera: { lens_mm: 35 } },
      defaultParams: { aspectRatio: '4:5' },
      kind: 'foto',
    })
    const result = await readStyleImport(asFile(json))
    expect(result).toEqual({
      name: 'Test-Stil',
      tags: ['a', 'b'],
      styleJson: { camera: { lens_mm: 35 } },
      defaultParams: { aspectRatio: '4:5' },
      kind: 'foto',
    })
  })

  it('setzt Defaults für fehlende tags/defaultParams und lässt kind weg', async () => {
    const json = JSON.stringify({ name: 'Minimal', styleJson: {} })
    const result = await readStyleImport(asFile(json))
    expect(result).toEqual({ name: 'Minimal', tags: [], styleJson: {}, defaultParams: {} })
    expect('kind' in result).toBe(false)
  })

  it('wirft bei ungültigem JSON', async () => {
    await expect(readStyleImport(asFile('{nicht json'))).rejects.toThrow(
      /kein gültiges JSON/,
    )
  })

  it('wirft bei fehlendem name', async () => {
    const json = JSON.stringify({ styleJson: {} })
    await expect(readStyleImport(asFile(json))).rejects.toThrow(/name/)
  })

  it('wirft bei fehlendem styleJson', async () => {
    const json = JSON.stringify({ name: 'X' })
    await expect(readStyleImport(asFile(json))).rejects.toThrow(/styleJson/)
  })
})
