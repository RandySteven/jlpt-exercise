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
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? pagesBase : '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    {
      name: 'production-security-meta',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
            injectTo: 'head-prepend',
          },
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: contentSecurityPolicy,
            },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  ],
})
