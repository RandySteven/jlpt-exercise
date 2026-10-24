import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { LocaleProvider } from './i18n/locale'
import { AuthProvider } from './lib/auth'
import { routeTree } from './routeTree.gen'
import './styles.css'

const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createRouter({
  routeTree,
  basepath,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element was not found')

createRoot(root).render(
  <StrictMode>
    <LocaleProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LocaleProvider>
  </StrictMode>,
)
