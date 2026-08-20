import { invoke } from '@tauri-apps/api/core'
import { describe, expect, it, vi } from 'vitest'
import { getAppVersion } from './app'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('getAppVersion', () => {
  it('reads the version through the app_version command', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('0.2.3')

    await expect(getAppVersion()).resolves.toBe('0.2.3')
    expect(invoke).toHaveBeenCalledWith('app_version')
  })
})
