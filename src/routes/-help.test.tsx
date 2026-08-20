// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HelpPage } from '#/components/HelpPage'

const mocks = vi.hoisted(() => ({
  checkForUpdates: vi.fn(),
  getAppVersion: vi.fn(),
}))

vi.mock('#/ipc/app', () => ({ getAppVersion: mocks.getAppVersion }))
vi.mock('#/lib/updates', () => ({ checkForUpdates: mocks.checkForUpdates }))

afterEach(() => {
  vi.clearAllMocks()
})

function renderHelp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <HelpPage />
    </QueryClientProvider>,
  )
}

describe('Help', () => {
  it('shows the installed version and reports an up-to-date result', async () => {
    mocks.getAppVersion.mockResolvedValue('0.2.3')
    mocks.checkForUpdates.mockResolvedValue({ status: 'up-to-date' })
    renderHelp()

    expect(await screen.findByText('Version 0.2.3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Nach Updates suchen' }))

    expect(await screen.findByText('Du verwendest bereits die aktuelle Version.')).toBeTruthy()
  })
})
