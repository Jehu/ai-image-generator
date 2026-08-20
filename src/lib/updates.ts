import { ask } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

export type UpdateCheckResult =
  | { status: 'up-to-date' }
  | { status: 'update-available' }
  | { status: 'installing' }
  | { status: 'unavailable' }

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const update = await check()
    if (!update) return { status: 'up-to-date' }

    const yes = await ask(
      `Version ${update.version} ist verfügbar. Jetzt herunterladen und installieren?`,
      { title: 'Update verfügbar' },
    )
    if (!yes) return { status: 'update-available' }

    await update.downloadAndInstall()
    await relaunch()
    return { status: 'installing' }
  } catch {
    return { status: 'unavailable' }
  }
}
