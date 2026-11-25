import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The demo build boots the MSW backend through a dynamic import, which the browser would only
 * discover after the entry chunk runs. Preloading it (and its dependencies) from the HTML lets
 * both download in parallel, shortening the chain to the first data-driven paint.
 */
function preloadMocks(): Plugin {
  return {
    name: 'kurio:preload-mocks',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      if (process.env.VITE_ENABLE_MOCKS === 'false' || !ctx.bundle) return html
      const chunks = Object.values(ctx.bundle)
      const entry = chunks.find((chunk) => chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('src/mocks/browser.ts'))
      if (!entry || entry.type !== 'chunk') return html
      const files = [entry.fileName, ...entry.imports]
      return {
        html,
        tags: files.map((file) => ({ tag: 'link', attrs: { rel: 'modulepreload', href: `/${file}`, crossorigin: '' }, injectTo: 'head' as const })),
      }
    },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadMocks(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // MSW's cookie jar is unused by this API (bearer tokens); see src/mocks/shims/tough-cookie.ts.
      'tough-cookie': path.resolve(import.meta.dirname, 'src/mocks/shims/tough-cookie.ts'),
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
