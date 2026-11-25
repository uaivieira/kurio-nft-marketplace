/**
 * Lighthouse CI configuration. `LH_PROFILE` selects mobile (Lighthouse default emulation)
 * or desktop. Each URL runs 3 times against the optimized build served by `vite preview`,
 * with the default mock scenario (the same build that is deployed).
 */
const profile = process.env.LH_PROFILE === 'desktop' ? 'desktop' : 'mobile'
const BASE = 'http://127.0.0.1:4174'

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm exec vite preview --host 127.0.0.1 --port 4174',
      startServerReadyPattern: '4174',
      url: [`${BASE}/`, `${BASE}/nft/emerald-ape-042`],
      numberOfRuns: 3,
      settings: {
        ...(profile === 'desktop' ? { preset: 'desktop' } : {}),
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    upload: { target: 'filesystem', outputDir: `lighthouse/reports/${profile}` },
  },
}
