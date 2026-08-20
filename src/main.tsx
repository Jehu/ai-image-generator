import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { isTauri } from '@tauri-apps/api/core'

import { getRouter } from './router'
import { getContext } from './integrations/tanstack-query/root-provider'
import { checkForUpdates } from './lib/updates'


import './styles.css'

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
