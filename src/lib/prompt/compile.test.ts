import { describe, expect, it } from 'vitest'
import { compilePrompt, wrapPromptForCopy } from './compile'

describe('compilePrompt', () => {
  it('verbindet Stil-Block mit subject', () => {
    const { promptObject, promptText } = compilePrompt({
      styleJson: { camera: { lens_mm: 35 }, mood: 'calm' },
      subject: 'a red apple',
    })
    expect(promptObject.subject).toBe('a red apple')
    expect(promptObject.camera).toEqual({ lens_mm: 35 })
    expect(JSON.parse(promptText)).toEqual(promptObject)
  })

  it('fügt style_reference nur bei Referenzbildern hinzu', () => {
    const withRef = compilePrompt({
      styleJson: { mood: 'calm' },
      subject: 'x',
      hasReferences: true,
    })
    expect(withRef.promptObject.style_reference).toBeDefined()

    const withoutRef = compilePrompt({ styleJson: { mood: 'calm' }, subject: 'x' })
    expect(withoutRef.promptObject.style_reference).toBeUndefined()
  })
})

describe('wrapPromptForCopy', () => {
  it('umschließt promptText mit Anweisung und Markdown-JSON-Fences', () => {
    const { promptText } = compilePrompt({
      styleJson: { mood: 'calm' },
      subject: 'a red apple',
    })
    const wrapped = wrapPromptForCopy(promptText)

    expect(wrapped).toBe(
      `generate an image based on the following configuration\n\n\`\`\`json\n${promptText}\n\`\`\``,
    )
    expect(wrapped.startsWith('generate an image based on the following configuration\n\n')).toBe(
      true,
    )
    expect(wrapped).toContain('```json\n')
    expect(wrapped.endsWith('\n```')).toBe(true)
  })
})
