import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/subscribe')({
  component: SubscribeLayout,
})

function SubscribeLayout() {
  return <Outlet />
}
