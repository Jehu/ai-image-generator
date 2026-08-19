// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PromptPreview } from '#/components/PromptPreview'
import { copyText } from '#/lib/clipboard'

vi.mock('#/lib/clipboard', () => ({
  copyText: vi.fn().mockResolvedValue(true),
}))

afterEach(cleanup)

describe('PromptPreview', () => {
  it('shows and copies the cleartext prompt independently from JSON', async () => {
    const { container, getByRole } = render(
      <PromptPreview
        styleJson={{ mood: 'calm' }}
        subject="a red apple"
        defaultOpen
      />,
    )

    fireEvent.click(getByRole('button', { name: 'Klartext' }))

    expect(container.querySelector('pre')?.textContent).toBe(
      'Create an image of a red apple.\n\nStyle requirements:\n- Mood: calm',
    )
    fireEvent.click(getByRole('button', { name: 'Kopieren' }))

    await vi.waitFor(() =>
      expect(copyText).toHaveBeenCalledWith(
        'Create an image of a red apple.\n\nStyle requirements:\n- Mood: calm',
      ),
    )
  })
})
