// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi, describe, expect, it } from 'vitest'

import { ModelPicker } from '#/components/ModelPicker'

vi.mock('#/ipc/models', () => ({
  listAvailableModels: vi.fn().mockResolvedValue([
    {
      providerId: 'openrouter',
      modelId: 'available/image',
      label: 'Available Image',
    },
    {
      providerId: 'openrouter',
      modelId: 'another/image',
      label: 'Another Image',
    },
  ]),
}))

describe('ModelPicker', () => {
  it('keeps an unavailable persisted model selected', async () => {
    const onChange = vi.fn()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <ModelPicker
          provider="openrouter"
          modelId="removed/image"
          onChange={onChange}
        />
      </QueryClientProvider>,
    )

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Available Image'),
    )
    expect(document.body.textContent).toContain(
      'Wähle ein anderes Modell, bevor du generierst.',
    )
    expect(onChange).not.toHaveBeenCalled()
  })
  it('selects the first discovered model for an empty selection', async () => {
    const onChange = vi.fn()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <ModelPicker provider="openrouter" modelId="" onChange={onChange} />
      </QueryClientProvider>,
    )

    await vi.waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('openrouter', 'available/image'),
    )
  })
})
