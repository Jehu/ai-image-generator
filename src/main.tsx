import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { isTauri } from '@tauri-apps/api/core'

import { getRouter } from './router'
import { getContext } from './integrations/tanstack-query/root-provider'

import './styles.css'

// Auto-Update: beim Start still prüfen; Installation nur nach Rückfrage.
async function checkForUpdates() {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return
    const { ask } = await import('@tauri-apps/plugin-dialog')
    const yes = await ask(
      `Version ${update.version} ist verfügbar. Jetzt herunterladen und installieren?`,
      { title: 'Update verfügbar' },
    )
    if (yes) {
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    }
  } catch {
    // Offline oder Update-Endpoint nicht erreichbar — still ignorieren.
  }
}
if (isTauri()) void checkForUpdates()

const context = getContext()
const router = getRouter(context)

const rootElement = document.getElementById('app')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={context.queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
