import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import ptBR from './src/i18n/locales/pt-BR.ts'

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

function localizeHtml(): Plugin {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const lookup = (key: string) => {
    const value = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), ptBR)
    if (typeof value !== 'string') throw new Error(`index.html references a missing translation: ${key}`)
    return escape(value)
  }
  return {
    name: 'kurio:localize-html',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replace(/%t:([\w.]+)%/g, (_, key: string) => lookup(key)) },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadMocks(),
    localizeHtml(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      { find: 'tough-cookie', replacement: path.resolve(import.meta.dirname, 'src/mocks/shims/tough-cookie.ts') },
      { find: /^zod$/, replacement: path.resolve(import.meta.dirname, 'src/lib/zod.ts') },
    ],
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
