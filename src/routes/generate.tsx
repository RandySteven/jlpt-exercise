import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { readAccessToken } from '../lib/auth'
import { hasActiveSubscription } from '../lib/billing'

export const Route = createFileRoute('/generate')({
  beforeLoad: async () => {
    const token = readAccessToken()
    if (!token) return
    const active = await hasActiveSubscription(token)
    if (active === false) throw redirect({ to: '/subscribe' })
  },
  component: GenerateLayout,
})

function GenerateLayout() {
  return <Outlet />
}
