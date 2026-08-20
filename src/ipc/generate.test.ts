import { invoke } from '@tauri-apps/api/core'
import { describe, expect, it, vi } from 'vitest'
import { generateImage } from './generate'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const input = {
  data: {
    styleJson: {},
    subject: 'Ein Porträt',
  },
}

describe('generateImage', () => {
  it('turns a serialized Tauri command error into an Error with its message', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(
      'OpenRouter-Bildgenerierung fehlgeschlagen: API-Schlüssel ungültig.',
    )

    await expect(generateImage(input)).rejects.toEqual(
      new Error(
        'OpenRouter-Bildgenerierung fehlgeschlagen: API-Schlüssel ungültig.',
      ),
    )
  })

  it('uses a helpful fallback when Tauri provides no error message', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(undefined)

    await expect(generateImage(input)).rejects.toEqual(
      new Error(
        'Die Bildgenerierung ist fehlgeschlagen. Bitte versuche es erneut.',
      ),
    )
  })
})
