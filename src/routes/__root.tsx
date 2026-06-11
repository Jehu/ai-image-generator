import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
})

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/' }}
      className="rounded px-3 py-1 text-muted-foreground hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
    >
      {children}
    </Link>
  )
}

function RootLayout() {
  return (
    <>
      <nav className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
          <span className="font-semibold">🎨 Image Style Studio</span>
          <div className="flex gap-1 text-sm">
            <NavLink to="/">Playground</NavLink>
            <NavLink to="/styles">Bibliothek</NavLink>
            <NavLink to="/settings">Einstellungen</NavLink>
          </div>
        </div>
      </nav>
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
      )}
    </>
  )
}
