import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ask: vi.fn(),
  check: vi.fn(),
  downloadAndInstall: vi.fn(),
  relaunch: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: mocks.relaunch }))

import { checkForUpdates } from './updates'

afterEach(() => {
  vi.clearAllMocks()
})

describe('checkForUpdates', () => {
  it('reports that the installed version is current', async () => {
    mocks.check.mockResolvedValue(null)

    await expect(checkForUpdates()).resolves.toEqual({ status: 'up-to-date' })
  })

  it('installs an accepted update and requests a relaunch', async () => {
    mocks.check.mockResolvedValue({
      version: '0.2.4',
      downloadAndInstall: mocks.downloadAndInstall,
    })
    mocks.ask.mockResolvedValue(true)

    await expect(checkForUpdates()).resolves.toEqual({ status: 'installing' })
    expect(mocks.ask).toHaveBeenCalledWith(
      'Version 0.2.4 ist verfügbar. Jetzt herunterladen und installieren?',
      { title: 'Update verfügbar' },
    )
    expect(mocks.downloadAndInstall).toHaveBeenCalledOnce()
    expect(mocks.relaunch).toHaveBeenCalledOnce()
  })

  it('reports an unavailable update service', async () => {
    mocks.check.mockRejectedValue(new Error('offline'))

    await expect(checkForUpdates()).resolves.toEqual({ status: 'unavailable' })
  })
})
