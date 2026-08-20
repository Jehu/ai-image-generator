import { createFileRoute } from '@tanstack/react-router'
import { HelpPage } from '#/components/HelpPage'

export const Route = createFileRoute('/help')({ component: HelpPage })
