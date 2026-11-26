/**
 * `zod`, configured. Vite resolves every `import … from 'zod'` here (alias in vite.config.ts), so this
 * runs before any schema is built.
 *
 * Zod compiles object parsers with `new Function` unless JIT is off, and probes for it when the first
 * object schema is constructed. The Content-Security-Policy has no `'unsafe-eval'`, so the probe would
 * be blocked and reported as a violation; the interpreted parser is used from the start instead.
 * A plain `z.config()` call in main.tsx is not enough: the bundler evaluates the shared chunks that
 * build schemas before the entry module's own code.
 */
import { config } from 'zod/v4/core'

config({ jitless: true })

export * from 'zod/v4'
