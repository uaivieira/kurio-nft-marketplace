import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const STALE_CHECK_SCRIPT = `(function(){var d=document.documentElement,p=location.pathname.replace(/\\/$/,'')||'/',w=d.getAttribute('data-prerender-when'),s=null,a=null,g=null,x=null;try{s=localStorage.getItem('kurio:mock:scenario');a=localStorage.getItem('kurio:session');g=localStorage.getItem('kurio:guest-id');x=sessionStorage.getItem('kurio:session-expired')}catch(e){}if(p!==d.getAttribute('data-prerender-path')||location.search||(s&&s!=='default')||(w&&(a||x))||(w==='new-visitor'&&g))d.setAttribute('data-prerender-stale','')})()`

export const LOADER_SCRIPT = `(function(){var boot=JSON.parse(document.getElementById('kurio-boot').textContent),done=false;function go(){if(done)return;done=true;boot.preloads.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)});var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=boot.entry;document.head.appendChild(s)}if(document.documentElement.hasAttribute('data-prerender-stale'))return go();setTimeout(go,1500);['pointerdown','keydown','touchstart','focusin'].forEach(function(t){addEventListener(t,go,{once:true,capture:true,passive:true})});try{var po=new PerformanceObserver(function(list){list.getEntries().forEach(function(e){if(e.element&&e.element.tagName==='IMG'){po.disconnect();setTimeout(go,0)}})});po.observe({type:'largest-contentful-paint',buffered:true})}catch(err){go()}})()`

export const cspHash = (source: string) => `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`

export function executableInlineScripts(html: string) {
  return [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes = '']) => !/\ssrc=/.test(attributes) && !/\stype="(?!module"|text\/javascript")[^"]*"/.test(attributes))
    .map((match) => match[2]!)
}

export function securityHeaders(vercelJson = path.resolve('vercel.json')): Record<string, string> {
  const config = JSON.parse(readFileSync(vercelJson, 'utf8')) as { routes: Array<{ src?: string; headers?: Record<string, string> }> }
  const route = config.routes.find((entry) => entry.src === '/(.*)' && entry.headers)
  if (!route?.headers) throw new Error('vercel.json: no catch-all route with headers')
  return route.headers
}

export function cspDirective(policy: string, name: string) {
  const directive = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name)
  return directive ? directive.slice(1) : undefined
}
