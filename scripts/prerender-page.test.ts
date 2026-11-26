import { describe, expect, it } from 'vitest'
import { fillPage, LCP_PRELOAD_MARKER } from './prerender-page'

const base = `<!doctype html><html lang="pt-BR"><head>${LCP_PRELOAD_MARKER}</head><body><div id="root"></div></body></html>`

describe('fillPage', () => {
  it('inserts data containing replacement patterns verbatim', () => {
    const root = '<div id="root"><h1>Before $` here, after $\' here, pay $& win, Golden $$DOGE</h1></div>'
    const page = fillPage(base, { route: '/nft/a"b', head: '<link rel="preload" />', root })
    expect(page).toContain(root)
    expect(page).toContain('data-prerender-path="/nft/a&quot;b"')
    expect(page).toContain('<head><link rel="preload" /></head>')
    expect(page.match(/<head>/g)).toHaveLength(1)
  })

  it('fails when the template lost a marker', () => {
    expect(() => fillPage(base.replace(LCP_PRELOAD_MARKER, ''), { route: '/', head: '', root: '' })).toThrow(LCP_PRELOAD_MARKER)
    expect(() => fillPage(base.replace('<div id="root"></div>', ''), { route: '/', head: '', root: '' })).toThrow('<div id="root"></div>')
  })
})
