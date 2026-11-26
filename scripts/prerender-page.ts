export const LCP_PRELOAD_MARKER = '%kurio:lcp-preload%'

const HTML_TAG = '<html lang="pt-BR">'
const ROOT_TAG = '<div id="root"></div>'

const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

function replaceOnce(source: string, search: string, replacement: string) {
  if (!source.includes(search)) throw new Error(`${search} not found in dist/index.html`)
  return source.replace(search, () => replacement)
}

export function fillPage(base: string, page: { route: string; head: string; root: string }) {
  let html = replaceOnce(base, HTML_TAG, `<html lang="pt-BR" data-prerender-path="${attribute(page.route)}">`)
  html = replaceOnce(html, LCP_PRELOAD_MARKER, page.head)
  return replaceOnce(html, ROOT_TAG, page.root)
}
