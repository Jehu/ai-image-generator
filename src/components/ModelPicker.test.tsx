// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ModelPicker } from '#/components/ModelPicker'

vi.mock('#/ipc/models', () => ({
  listAvailableModels: vi.fn().mockResolvedValue([
    {
      providerId: 'venice',
      modelId: 'z-image',
      label: 'Z Image',
      supportsStyleReferences: false,
    },
    {
      providerId: 'openrouter',
      modelId: 'available/image',
      label: 'Available Image',
      supportsStyleReferences: false,
    },
    {
      providerId: 'venice',
      modelId: 'krea-v2',
      label: 'Krea v2',
      supportsStyleReferences: true,
    },
    {
      providerId: 'openrouter',
      modelId: 'another/image',
      label: 'Another Image',
      supportsStyleReferences: true,
    },
  ]),
}))

afterEach(cleanup)

function renderPicker(
  provider = 'openrouter',
  modelId = 'available/image',
  onChange = vi.fn(),
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return {
    onChange,
    ...render(
      <QueryClientProvider client={client}>
        <ModelPicker
          provider={provider}
          modelId={modelId}
          onChange={onChange}
        />
      </QueryClientProvider>,
    ),
  }
}

describe('ModelPicker', () => {
  it('keeps an unavailable persisted model visible as an error', async () => {
    renderPicker('openrouter', 'removed/image')
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        'Wähle ein anderes Modell, bevor du generierst.',
      ),
    )
  })

  it('selects the first alphabetically sorted model for an empty selection', async () => {
    const onChange = vi.fn()
    renderPicker('openrouter', '', onChange)
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('openrouter', 'another/image'),
    )
  })

  it('lists provider-labelled models in provider and label order', async () => {
    renderPicker()
    await vi.waitFor(() =>
      expect(document.querySelectorAll('datalist option')).toHaveLength(4),
    )
    expect(
      Array.from(
        document.querySelectorAll<HTMLOptionElement>('datalist option'),
      ).map((option) => option.value),
    ).toEqual([
      'OpenRouter — Another Image · Stil-Anker',
      'OpenRouter — Available Image',
      'Venice — Krea v2 · Stil-Anker',
      'Venice — Z Image',
    ])
  })

  it('keeps the chosen model in the autocomplete field', async () => {
    const { getByPlaceholderText, onChange } = renderPicker()
    const input = await vi.waitFor(() => getByPlaceholderText('Modell suchen…'))
    fireEvent.change(input, {
      target: { value: 'Venice — Krea v2 · Stil-Anker' },
    })
    expect((input as HTMLInputElement).value).toBe(
      'Venice — Krea v2 · Stil-Anker',
    )
    expect(onChange).toHaveBeenCalledWith('venice', 'krea-v2')
  })

  it('shows whether the selected model supports style references', async () => {
    renderPicker('venice', 'krea-v2')

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Stil-Anker: unterstützt'),
    )
  })
})
