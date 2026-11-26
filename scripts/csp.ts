/**
 * Inline scripts emitted by the prerender and the Content-Security-Policy that allows them.
 *
 * The policy lives in vercel.json, a static file, so it can only list `'sha256-…'` hashes of scripts
 * whose bytes never change across pages or builds. Everything that varies (the route the HTML was
 * rendered for, the dehydrated query cache, the hashed bundle names) is data: an attribute on
 * <html> or a non-executable `<script type="application/json">` block read by the fixed scripts.
 * `scripts/prerender.ts` fails the build if any page carries an inline script the policy does not
 * allow, so the hashes cannot drift from the HTML that is deployed.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Head script, runs before first paint: when the URL is not the one the HTML was rendered for
 * (SPA fallback, or catalog filters in the query string), the prerendered markup is marked stale.
 */
export const STALE_CHECK_SCRIPT = `(function(){var d=document.documentElement,p=location.pathname.replace(/\\/$/,'')||'/';if(p!==d.getAttribute('data-prerender-path')||location.search)d.setAttribute('data-prerender-stale','')})()`

/**
 * Fetches the app bundle (entry + modulepreloads, read from #kurio-boot) once the LCP image has been
 * painted, with a 1.5 s ceiling, on the first interaction, or at once when the markup is stale.
 */
export const LOADER_SCRIPT = `(function(){var boot=JSON.parse(document.getElementById('kurio-boot').textContent),done=false;function go(){if(done)return;done=true;boot.preloads.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)});var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=boot.entry;document.head.appendChild(s)}if(document.documentElement.hasAttribute('data-prerender-stale'))return go();setTimeout(go,1500);['pointerdown','keydown','touchstart','focusin'].forEach(function(t){addEventListener(t,go,{once:true,capture:true,passive:true})});try{var po=new PerformanceObserver(function(list){list.getEntries().forEach(function(e){if(e.element&&e.element.tagName==='IMG'){po.disconnect();setTimeout(go,0)}})});po.observe({type:'largest-contentful-paint',buffered:true})}catch(err){go()}})()`

/** CSP source expression for an inline script or style. */
export const cspHash = (source: string) => `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`

/** Bodies of the inline scripts the browser would execute (no `src`, JavaScript type). */
export function executableInlineScripts(html: string) {
  return [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes = '']) => !/\ssrc=/.test(attributes) && !/\stype="(?!module"|text\/javascript")[^"]*"/.test(attributes))
    .map((match) => match[2]!)
}

/** Headers applied to every response by the first, catch-all route of vercel.json. */
export function securityHeaders(vercelJson = path.resolve('vercel.json')): Record<string, string> {
  const config = JSON.parse(readFileSync(vercelJson, 'utf8')) as { routes: Array<{ src?: string; headers?: Record<string, string> }> }
  const route = config.routes.find((entry) => entry.src === '/(.*)' && entry.headers)
  if (!route?.headers) throw new Error('vercel.json: no catch-all route with headers')
  return route.headers
}

/** Source expressions of one CSP directive. */
export function cspDirective(policy: string, name: string) {
  const directive = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name)
  return directive ? directive.slice(1) : undefined
}
