import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/generate')({
  component: GenerateLayout,
})

function GenerateLayout() {
  return <Outlet />
}
