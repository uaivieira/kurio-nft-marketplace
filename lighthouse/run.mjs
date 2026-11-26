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
}

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
    rows.push(`| ${page} | ${profile} | ${CATEGORIES.map(score).join(' | ')} | ${(metric('largest-contentful-paint') / 1000).toFixed(2)} s | ${metric('cumulative-layout-shift').toFixed(3)} | ${Math.round(metric('total-blocking-time'))} ms |`)
  }
}

const summary = `# Lighthouse — medians (3 runs per page and profile)

Gerado em ${new Date().toISOString()} por \`pnpm lighthouse\` (build otimizado servido por \`vite preview\`, cenário de mocks \`default\`).

| Page | Profile | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Environment

- Lighthouse ${lighthouseVersion} (via @lhci/cli), Chrome ${chromeVersion}
- Node ${process.version}, ${os.type()} ${os.release()} ${os.arch()}, ${os.cpus()[0]?.model ?? ''}
- Perfil mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4x). Perfil desktop: preset \`desktop\`.
- Relatórios HTML/JSON de cada execução: \`lighthouse/reports/<perfil>/\`.
`
writeFileSync('lighthouse/reports/summary.md', summary)
console.log(summary)
