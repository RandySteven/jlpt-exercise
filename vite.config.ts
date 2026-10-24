import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const pagesBase = '/jlpt-exercise/'

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com${process.env.VITE_API_URL ? ` ${process.env.VITE_API_URL}` : ' http://localhost:8080'}`,
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? pagesBase : '/',
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:8080', changeOrigin: true },
      '/exercise': { target: 'http://localhost:8080', changeOrigin: true },
      '/payment': { target: 'http://localhost:8080', changeOrigin: true },
      '/dummy': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    {
      name: 'production-security-meta',
      apply: 'build',
      transformIndexHtml(html) {
        const tags = [
          '<meta name="referrer" content="strict-origin-when-cross-origin">',
          `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">`,
        ].join('\n    ')
        return html.replace('<head>', `<head>\n    ${tags}`)
      },
    },
  ],
})
