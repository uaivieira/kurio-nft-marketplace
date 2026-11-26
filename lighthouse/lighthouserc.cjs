const profile = process.env.LH_PROFILE === 'desktop' ? 'desktop' : 'mobile'
const BASE = 'http://127.0.0.1:4174'

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm exec vite preview --host 127.0.0.1 --port 4174',
      startServerReadyPattern: '4174',
      url: [`${BASE}/`, `${BASE}/mercado`, `${BASE}/nft/emerald-ape-042`],
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
