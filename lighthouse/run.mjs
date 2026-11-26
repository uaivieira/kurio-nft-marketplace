import { execSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

for (const profile of PROFILES) {
  rmSync(`lighthouse/reports/${profile}`, { recursive: true, force: true })
  execSync('pnpm exec lhci collect --config=lighthouse/lighthouserc.cjs && pnpm exec lhci upload --config=lighthouse/lighthouserc.cjs', {
    stdio: 'inherit',
    env: { ...process.env, LH_PROFILE: profile },
  })
  rmSync('.lighthouseci', { recursive: true, force: true })
  const manifestPath = `lighthouse/reports/${profile}/manifest.json`
  const relative = (file) => path.relative(process.cwd(), file).split(path.sep).join('/')
  const entries = JSON.parse(readFileSync(manifestPath, 'utf8')).map((entry) => ({ ...entry, htmlPath: relative(entry.htmlPath), jsonPath: relative(entry.jsonPath) }))
  writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`)
}

const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const dirty = execSync('git status --porcelain -- src scripts public index.html vite.config.ts vercel.json', { encoding: 'utf8' }).trim() !== ''

let lighthouseVersion = ''
let chromeVersion = ''
const rows = []
for (const profile of PROFILES) {
  const manifest = JSON.parse(readFileSync(`lighthouse/reports/${profile}/manifest.json`, 'utf8'))
  const byUrl = Object.groupBy(manifest, (entry) => new URL(entry.url).pathname)
  for (const [page, runs] of Object.entries(byUrl)) {
    const reports = runs.map((run) => JSON.parse(readFileSync(path.resolve(run.jsonPath), 'utf8')))
    lighthouseVersion = reports[0].lighthouseVersion
    chromeVersion = reports[0].environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? ''
    const score = (id) => Math.round(median(reports.map((r) => r.categories[id].score)) * 100)
    const metric = (id) => median(reports.map((r) => r.audits[id].numericValue))
    const agentic = (report) => {
      const applicable = report.categories['agentic-browsing'].auditRefs.map((ref) => report.audits[ref.id]).filter((audit) => audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'informative' && audit.score !== null)
      return `${applicable.filter((audit) => audit.score === 1).length}/${applicable.length}`
    }
    rows.push(`| ${page} | ${profile} | ${CATEGORIES.map(score).join(' | ')} | ${agentic(reports[0])} | ${(metric('largest-contentful-paint') / 1000).toFixed(2)} s | ${metric('cumulative-layout-shift').toFixed(3)} | ${Math.round(metric('total-blocking-time'))} ms |`)
  }
}

const summary = `# Lighthouse — medians (3 runs per page and profile)

Gerado em ${new Date().toISOString()} por \`pnpm lighthouse\` (build otimizado servido por \`vite preview\`, cenário de mocks \`default\`).

Commit auditado: \`${commit}\`${dirty ? ' com alterações locais não commitadas em código de aplicação' : ''}.

| Page | Profile | Performance | Accessibility | Best Practices | SEO | Agentic Browsing | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Environment

- Lighthouse ${lighthouseVersion} (via @lhci/cli), Chrome ${chromeVersion}
- Node ${process.version}, ${os.type()} ${os.release()} ${os.arch()}, ${os.cpus()[0]?.model ?? ''}
- Perfil mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4x). Perfil desktop: preset \`desktop\`.
- Relatórios HTML/JSON de cada execução: \`lighthouse/reports/<perfil>/\`.
- Agentic Browsing conta só as auditorias aplicáveis; as de WebMCP aparecem como "não se aplica" quando o Chrome não expõe \`navigator.modelContext\` (as ferramentas são cobertas por \`tests/e2e/agentic.spec.ts\`).
`
writeFileSync('lighthouse/reports/summary.md', summary)
console.log(summary)
