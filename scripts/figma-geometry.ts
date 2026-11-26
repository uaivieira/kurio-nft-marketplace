import type { Page } from '@playwright/test'
import type { Box, FrameNodes, ShapeNode, TextNode } from './figma-svg.ts'

export const BOX_TOLERANCE = 1
export const LINE_HEIGHT_TOLERANCE = 1
const THIN_RECT = 10

export interface TextExemption {
  figma: string
  app?: string
  ignore?: ('x' | 'y' | 'w' | 'lines' | 'color' | 'font')[]
  anchor?: 'left' | 'right' | 'center'
  skip?: boolean
  reason: string
}

export interface ShapeExemption {
  id: string
  ignore?: ('x' | 'y' | 'w' | 'h' | 'radius' | 'paint')[]
  skip?: boolean
  reason: string
}

export interface FrameExemptions {
  regions?: { boxes: { box: [number, number, number, number]; above?: string }[]; reason: string }
  shift?: { anchor: string; from: number; to: number; reason: string }
  texts?: TextExemption[]
  shapes?: ShapeExemption[]
}

interface MeasuredLine {
  text: string
  x: number
  baseline: number
  w: number
}

interface MeasuredText {
  id: string
  matched: string
  lines: MeasuredLine[]
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number | null
  color: string
  opacity: number
}

interface Paint {
  box: Box
  label: string
  bg: string | null
  gradient: string[] | null
  image: boolean
  borders: { top: [number, string | null]; right: [number, string | null]; bottom: [number, string | null]; left: [number, string | null] }
  radius: number
  opacity: number
}

interface PageInput {
  texts: { id: string; content: string; box: Box; app: string | null; lines: { text: string; x: number; baseline: number; w: number }[] }[]
}

interface PageOutput {
  background: string | null
  texts: (MeasuredText | null)[]
  paints: Paint[]
}

function collect(input: PageInput): PageOutput {
  const HIDDEN = '[aria-label="Painel de cenários simulados"], [data-sonner-toaster]'
  const hex = (value: string, keepTransparent = false) => {
    const match = value.match(/rgba?\(([^)]+)\)/)
    if (!match) return null
    const [r, g, b, a] = match[1]!.split(/[\s,/]+/).filter(Boolean).map(Number)
    if (a === 0 && !keepTransparent) return null
    const code = `#${[r!, g!, b!].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
    return a === undefined || a === 1 ? code : `${code}/${Math.round(a * 100) / 100}`
  }
  const norm = (value: string) => value.replace(/[\s ]+/g, ' ').trim()
  const visible = (element: Element) => !element.closest(HIDDEN) && element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })
  const opacityOf = (element: Element | null) => {
    let value = 1
    for (let node = element; node; node = node.parentElement) value *= Number(getComputedStyle(node).opacity)
    return Math.round(value * 1000) / 1000
  }
  const page = (rect: DOMRect) => ({ x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height })
  const tiny = (element: Element) => {
    const rect = element.getBoundingClientRect()
    return rect.width <= 1 || rect.height <= 1
  }

  const baselines = new Map<string, number>()
  const ascentOf = (style: CSSStyleDeclaration) => {
    const key = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const cached = baselines.get(key)
    if (cached !== undefined) return cached
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;left:0;top:0;line-height:normal;white-space:nowrap;font-weight:${style.fontWeight};font-size:${style.fontSize};font-family:${style.fontFamily}`
    const text = document.createTextNode('Hg')
    const marker = document.createElement('span')
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    probe.append(text, marker)
    document.body.append(probe)
    const range = document.createRange()
    range.selectNodeContents(text)
    const value = marker.getBoundingClientRect().bottom - range.getBoundingClientRect().top
    probe.remove()
    baselines.set(key, value)
    return value
  }
  const transformText = (value: string, style: CSSStyleDeclaration) => (style.textTransform === 'uppercase' ? value.toUpperCase() : style.textTransform === 'lowercase' ? value.toLowerCase() : value)

  const elements = [...document.body.querySelectorAll('*')].filter((element) => visible(element) && !(element instanceof HTMLScriptElement) && !(element instanceof HTMLStyleElement))
  const textOf = new Map<Element, string>()
  for (const element of elements) if (element instanceof HTMLElement) textOf.set(element, norm(element.innerText))
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (node instanceof Text && parent && norm(node.data) && visible(parent) && !tiny(parent)) textNodes.push(node)
  }

  const flat = { text: '', map: [] as [Text, number][] }
  const container = (node: Text) => {
    let element = node.parentElement
    while (element && getComputedStyle(element).display === 'inline') element = element.parentElement
    return element
  }
  let previous: Element | null = null
  for (const node of textNodes) {
    const data = transformText(node.data, getComputedStyle(node.parentElement!))
    const box = container(node)
    if (previous && box !== previous && flat.text && !flat.text.endsWith(' ')) {
      flat.text += ' '
      flat.map.push(flat.map[flat.map.length - 1]!)
    }
    previous = box
    for (let i = 0; i < data.length; i += 1) {
      const space = /\s/.test(data[i]!)
      if (space && (flat.text.endsWith(' ') || !flat.text)) continue
      flat.text += space ? ' ' : data[i]
      flat.map.push([node, i])
    }
  }
  const used = new Set<string>()
  const measureRanges = (ranges: Range[], matched: string): Omit<MeasuredText, 'id'> | null => {
    const fragments: { box: Box; baseline: number; text: string }[] = []
    let first: Element | null = null
    const pieces = ranges.flatMap((range) => {
      if (range.startContainer === range.endContainer) return [range]
      return textNodes
        .filter((node) => range.intersectsNode(node))
        .map((node) => {
          const piece = document.createRange()
          piece.selectNodeContents(node)
          if (node === range.startContainer) piece.setStart(node, range.startOffset)
          if (node === range.endContainer) piece.setEnd(node, range.endOffset)
          return piece
        })
    })
    for (const range of pieces) {
      const parent = (range.startContainer as Text).parentElement!
      first ??= parent
      const style = getComputedStyle(parent)
      const ascent = ascentOf(style)
      const text = norm(transformText(range.toString(), style))
      for (const rect of range.getClientRects()) {
        if (rect.width < 0.5) continue
        fragments.push({ box: page(rect), baseline: rect.top + window.scrollY + ascent, text })
      }
    }
    if (!first || !fragments.length) return null
    fragments.sort((a, b) => a.baseline - b.baseline || a.box.x - b.box.x)
    const lines: MeasuredLine[] = []
    let current: typeof fragments = []
    const flush = () => {
      if (!current.length) return
      const left = Math.min(...current.map((fragment) => fragment.box.x))
      const right = Math.max(...current.map((fragment) => fragment.box.x + fragment.box.w))
      const main = current.reduce((best, fragment) => (fragment.box.w > best.box.w ? fragment : best))
      lines.push({ text: current.map((fragment) => fragment.text).join(' '), x: left, baseline: main.baseline, w: right - left })
      current = []
    }
    for (const fragment of fragments) {
      if (current.length && Math.abs(fragment.baseline - current[0]!.baseline) > 3) flush()
      current.push(fragment)
    }
    flush()
    lines.sort((a, b) => a.baseline - b.baseline)
    const style = getComputedStyle(first)
    return {
      matched,
      lines,
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
      letterSpacing: style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing),
      lineHeight: style.lineHeight === 'normal' ? null : parseFloat(style.lineHeight),
      color: hex(style.color) ?? style.color,
      opacity: opacityOf(first),
    }
  }

  const elementRanges = (element: Element) =>
    textNodes
      .filter((node) => element.contains(node))
      .map((node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return range
      })

  const distance = (box: Box, target: Box) => Math.abs(box.x - target.x) + Math.abs(box.y - target.y)
  type Candidate = { key: string; box: Box; measure: () => Omit<MeasuredText, 'id'> | null }
  const controlMeasure = (input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, text: string) => (): Omit<MeasuredText, 'id'> => {
    const style = getComputedStyle(input, input instanceof HTMLSelectElement ? null : '::placeholder')
    const box = getComputedStyle(input)
    const rect = input.getBoundingClientRect()
    const context = document.createElement('canvas').getContext('2d')!
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const spacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing)
    const width = context.measureText(text).width + spacing * [...text].length
    const contentTop = rect.top + parseFloat(box.borderTopWidth) + parseFloat(box.paddingTop)
    const contentHeight = rect.height - parseFloat(box.borderTopWidth) - parseFloat(box.borderBottomWidth) - parseFloat(box.paddingTop) - parseFloat(box.paddingBottom)
    const ascent = ascentOf(style)
    const lineHeight = style.lineHeight === 'normal' ? Math.round(ascent) + Math.round(parseFloat(style.fontSize) * 0.271) : parseFloat(style.lineHeight)
    const left = rect.left + parseFloat(box.borderLeftWidth) + parseFloat(box.paddingLeft)
    const top = input instanceof HTMLTextAreaElement ? contentTop : contentTop + (contentHeight - lineHeight) / 2
    return {
      matched: text,
      lines: [{ text, x: left + window.scrollX, baseline: top + window.scrollY + (lineHeight - (Math.round(ascent) + Math.round(parseFloat(style.fontSize) * 0.271))) / 2 + ascent, w: width }],
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
      letterSpacing: spacing,
      lineHeight: style.lineHeight === 'normal' ? null : parseFloat(style.lineHeight),
      color: hex(style.color) ?? style.color,
      opacity: opacityOf(input),
    }
  }
  const find = (raw: string): Candidate[] => {
    const wanted = norm(raw)
    const pattern = wanted.length > 2 && wanted.startsWith('/') && wanted.endsWith('/') ? new RegExp(wanted.slice(1, -1)) : null
    const equals = (value: string) => (pattern ? pattern.test(value) && norm(value.match(pattern)![0]) === value : value === wanted)
    const candidates: Candidate[] = []
    const exact = elements.filter((element) => {
      const value = textOf.get(element)
      return value !== undefined && equals(value)
    })
    for (const element of exact) {
      if (exact.some((other) => other !== element && element.contains(other))) continue
      const ranges = elementRanges(element)
      if (!ranges.length) continue
      candidates.push({ key: `e:${elements.indexOf(element)}`, box: page(ranges[0]!.getBoundingClientRect()), measure: () => measureRanges(ranges, textOf.get(element)!) })
    }
    for (const element of elements) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) || element.value || !element.placeholder || !equals(norm(element.placeholder))) continue
      const measure = controlMeasure(element, element.placeholder)
      const line = measure().lines[0]!
      candidates.push({ key: `p:${elements.indexOf(element)}`, box: { x: line.x, y: line.baseline - 15, w: line.w, h: 20 }, measure })
    }
    for (const element of elements) {
      if (!(element instanceof HTMLSelectElement)) continue
      const label = element.selectedOptions[0]?.text ?? ''
      if (!equals(norm(label))) continue
      const measure = controlMeasure(element, label)
      const line = measure().lines[0]!
      candidates.push({ key: `s:${elements.indexOf(element)}`, box: { x: line.x, y: line.baseline - 15, w: line.w, h: 20 }, measure })
    }
    if (candidates.some((candidate) => !used.has(candidate.key))) return candidates
    const found = pattern ? [...flat.text.matchAll(new RegExp(pattern.source.replace(/^\^/, '').replace(/\$$/, ''), 'g'))].map((match) => [match.index, match[0].length] as const) : []
    if (!pattern) for (let from = flat.text.indexOf(wanted); from >= 0 && wanted; from = flat.text.indexOf(wanted, from + 1)) found.push([from, wanted.length])
    for (const [from, length] of found) {
      const start = flat.map[from]
      const end = flat.map[from + length - 1]
      if (!start || !end) continue
      const range = document.createRange()
      range.setStart(start[0], start[1])
      range.setEnd(end[0], end[1] + 1)
      candidates.push({ key: `f:${from}`, box: page(range.getBoundingClientRect()), measure: () => measureRanges([range], flat.text.slice(from, from + length)) })
    }
    return candidates
  }
  const pick = (candidates: Candidate[], box: Box) => {
    const best = candidates.filter((candidate) => !used.has(candidate.key)).sort((a, b) => distance(a.box, box) - distance(b.box, box))[0]
    if (best) used.add(best.key)
    return best
  }
  const texts = input.texts.map((target) => {
    const whole = pick(find(target.app ?? target.content), target.box)
    if (whole) {
      const measured = whole.measure()
      return measured ? { id: target.id, ...measured } : null
    }
    if (target.app || target.lines.length < 2) return null
    const parts = target.lines.map((line) => pick(find(line.text), { x: line.x, y: line.baseline - 15, w: line.w, h: 20 })?.measure() ?? null)
    if (parts.some((part) => !part)) return null
    const [first] = parts as Omit<MeasuredText, 'id'>[]
    return { id: target.id, ...first!, matched: target.content, lines: parts.flatMap((part) => part!.lines) }
  })

  const border = (style: CSSStyleDeclaration, side: 'Top' | 'Right' | 'Bottom' | 'Left'): [number, string | null] => {
    const width = style[`border${side}Style`] === 'none' ? 0 : parseFloat(style[`border${side}Width`])
    return [width, width ? hex(style[`border${side}Color`]) : null]
  }
  const paints: Paint[] = []
  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 0.2) continue
    const style = getComputedStyle(element)
    const label = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.getAttribute('data-testid') ? `[${element.getAttribute('data-testid')}]` : ''}${element.getAttribute('aria-label') ? `[${element.getAttribute('aria-label')}]` : ''}`
    const isSvgShape = element instanceof SVGGeometryElement
    const bg = isSvgShape ? hex(style.fill) : hex(style.backgroundColor)
    const gradient = style.backgroundImage.includes('gradient') ? [...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(([value]) => hex(value, true) ?? value) : null
    const image = element instanceof HTMLImageElement || element instanceof SVGImageElement || /url\(/.test(style.backgroundImage)
    const svgStroke: [number, string | null] = [style.stroke === 'none' ? 0 : parseFloat(style.strokeWidth), hex(style.stroke)]
    const borders = isSvgShape ? { top: svgStroke, right: svgStroke, bottom: svgStroke, left: svgStroke } : { top: border(style, 'Top'), right: border(style, 'Right'), bottom: border(style, 'Bottom'), left: border(style, 'Left') }
    const hasBorder = Object.values(borders).some(([width, paint]) => width > 0 && paint)
    if (!bg && !gradient && !image && !hasBorder) continue
    const radiusValue = style.borderTopLeftRadius
    const radius = radiusValue.endsWith('%') ? (parseFloat(radiusValue) / 100) * rect.width : parseFloat(radiusValue) || 0
    paints.push({ box: page(rect), label, bg, gradient, image, borders, radius: Math.min(radius, rect.width / 2, rect.height / 2), opacity: opacityOf(element) })
  }
  return { background: hex(getComputedStyle(document.body).backgroundColor), texts, paints }
}

export interface FrameResult {
  checked: number
  failures: string[]
  rows: string[]
}

const fmt = (value: number) => String(Math.round(value * 10) / 10)
const boxText = (box: Box) => `x ${fmt(box.x)} y ${fmt(box.y)} w ${fmt(box.w)} h ${fmt(box.h)}`

function checkText(node: TextNode, measured: MeasuredText | null, exemption: TextExemption | undefined): string[] {
  const label = `text ${node.id} "${node.content.replace(/\n/g, ' / ')}"`
  if (!measured) return [`${label}: not found in the app`]
  const ignore = new Set(exemption?.ignore)
  const issues: string[] = []
  if (!ignore.has('lines') && measured.lines.length !== node.lines.length) issues.push(`lines ${measured.lines.length} (figma ${node.lines.length})`)
  const count = Math.min(measured.lines.length, node.lines.length)
  for (let i = 0; i < count; i += 1) {
    const figma = node.lines[i]!
    const app = measured.lines[i]!
    const anchor = exemption?.anchor === 'right' ? 1 : exemption?.anchor === 'center' ? 0.5 : 0
    const deltas = (
      [
        ['x', app.x + app.w * anchor - (figma.x + figma.w * anchor)],
        ['y', app.baseline - figma.baseline],
        ['w', app.w - figma.w],
      ] as const
    ).filter(([key, delta]) => !ignore.has(key) && Math.abs(delta) > BOX_TOLERANCE)
    if (deltas.length) issues.push(`line ${i + 1} ${deltas.map(([key, delta]) => `${key === 'y' ? 'baseline' : key} ${delta > 0 ? '+' : ''}${fmt(delta)}`).join(' ')} (figma x ${fmt(figma.x)} baseline ${fmt(figma.baseline)} w ${fmt(figma.w)})`)
  }
  if (!ignore.has('font')) {
    if (Math.abs(measured.fontSize - node.fontSize) > 0.01) issues.push(`font-size ${measured.fontSize} (figma ${node.fontSize})`)
    if (measured.fontWeight !== node.fontWeight) issues.push(`font-weight ${measured.fontWeight} (figma ${node.fontWeight})`)
    if (Math.abs(measured.letterSpacing - node.letterSpacing) > 0.01) issues.push(`letter-spacing ${fmt(measured.letterSpacing)} (figma ${node.letterSpacing})`)
    if (node.lineHeight !== null && (measured.lineHeight === null || Math.abs(measured.lineHeight - node.lineHeight) > LINE_HEIGHT_TOLERANCE)) issues.push(`line-height ${measured.lineHeight ?? 'normal'} (figma ${node.lineHeight})`)
  }
  if (!ignore.has('color') && node.color) {
    const expected = node.opacity < 1 ? `${node.color}@${node.opacity}` : node.color
    const actual = measured.opacity < 1 ? `${measured.color}@${measured.opacity}` : measured.color
    if (expected !== actual) issues.push(`color ${actual} (figma ${expected})`)
  }
  return issues.length ? [`${label}: ${issues.join('; ')}`] : []
}

function paintMatches(shape: ShapeNode, paint: Paint) {
  if (shape.image) return paint.image
  if (shape.gradient) return Boolean(paint.gradient) && paint.gradient!.join(' ') === shape.gradient.join(' ')
  if (shape.kind === 'line') return true
  const sides = Object.values(paint.borders)
  if (shape.fill && paint.bg !== shape.fill) return false
  if (!shape.fill && shape.stroke) return sides.every(([width, color]) => width > 0 && color === shape.stroke)
  return true
}

function lineCandidates(shape: ShapeNode, paints: Paint[]) {
  const horizontal = shape.box.w >= shape.box.h
  const boxes: { box: Box; paint: Paint; width: number }[] = []
  for (const paint of paints) {
    const { x, y, w, h } = paint.box
    const edges = horizontal
      ? ([
          ['top', { x, y, w, h: paint.borders.top[0] }],
          ['bottom', { x, y: y + h - paint.borders.bottom[0], w, h: paint.borders.bottom[0] }],
        ] as const)
      : ([
          ['left', { x, y, w: paint.borders.left[0], h }],
          ['right', { x: x + w - paint.borders.right[0], y, w: paint.borders.right[0], h }],
        ] as const)
    for (const [side, box] of edges) if (paint.borders[side][0] > 0 && paint.borders[side][1] === shape.stroke) boxes.push({ box, paint, width: paint.borders[side][0] })
    if (paint.bg === shape.stroke && (horizontal ? h : w) <= THIN_RECT) boxes.push({ box: paint.box, paint, width: horizontal ? h : w })
  }
  return boxes
}

function checkShape(shape: ShapeNode, paints: Paint[], exemption: ShapeExemption | undefined): string[] {
  const label = `${shape.kind} ${shape.id} [${shape.image ? 'image' : shape.gradient ? `gradient ${shape.gradient.join(' ')}` : [shape.fill && `fill ${shape.fill}`, shape.stroke && `stroke ${shape.stroke} ${shape.strokeWidth}`].filter(Boolean).join(', ')}] at ${boxText(shape.box)}`
  const ignore = new Set(exemption?.ignore)
  const keys = (['x', 'y', 'w', 'h'] as const).filter((key) => !ignore.has(key))
  const thin = shape.kind === 'rect' && shape.fill !== null && Math.min(shape.box.w, shape.box.h) <= THIN_RECT
  const fits = (box: Box) => keys.every((key) => Math.abs(box[key] - shape.box[key]) <= BOX_TOLERANCE + ((shape.kind === 'line' || thin) && (key === 'h' || key === 'w') ? 1 : 0))
  const score = (box: Box) => keys.reduce((sum, key) => sum + Math.abs(box[key] - shape.box[key]), 0)
  const candidates = shape.kind === 'line' || thin ? lineCandidates(thin ? { ...shape, stroke: shape.fill } : shape, paints) : paints.filter((paint) => ignore.has('paint') || paintMatches(shape, paint)).map((paint) => ({ box: paint.box, paint, width: 0 }))
  const hit = candidates.filter((candidate) => fits(candidate.box)).sort((a, b) => score(a.box) - score(b.box))[0]
  if (!hit) {
    const nearest = candidates.sort((a, b) => score(a.box) - score(b.box))[0]
    const sameBox = shape.kind === 'line' ? undefined : paints.filter((paint) => fits(paint.box)).sort((a, b) => score(a.box) - score(b.box))[0]
    const hints = [nearest && `nearest same paint ${nearest.paint.label} ${boxText(nearest.box)}`, sameBox && `same box ${sameBox.label} bg ${sameBox.bg ?? '-'} border ${sameBox.borders.top.join(' ')}`].filter(Boolean)
    return [`${label}: no match${hints.length ? ` (${hints.join('; ')})` : ''}`]
  }
  const issues: string[] = []
  if (shape.kind !== 'line' && !thin && !ignore.has('radius') && shape.radius !== null) {
    const expected = Math.min(shape.radius, shape.box.w / 2, shape.box.h / 2)
    if (Math.abs(hit.paint.radius - expected) > 0.5) issues.push(`radius ${fmt(hit.paint.radius)} (figma ${fmt(expected)})`)
  }
  if (shape.stroke && shape.strokeWidth !== null && !ignore.has('paint')) {
    const width = shape.kind === 'line' ? hit.width : Math.max(...Object.values(hit.paint.borders).map(([value]) => value))
    const expected = Math.max(1, shape.strokeWidth)
    if (Math.abs(width - expected) > 0.5 && !(shape.strokeWidth < 1 && width <= 1)) issues.push(`stroke-width ${fmt(width)} (figma ${shape.strokeWidth})`)
    if (shape.kind !== 'line' && shape.fill && !Object.values(hit.paint.borders).some(([, color]) => color === shape.stroke)) issues.push(`stroke ${hit.paint.borders.top[1] ?? 'none'} (figma ${shape.stroke})`)
  }
  if (shape.opacity < 1 && Math.abs(hit.paint.opacity - shape.opacity) > 0.02 && !ignore.has('paint')) issues.push(`opacity ${hit.paint.opacity} (figma ${shape.opacity})`)
  return issues.length ? [`${label}: ${hit.paint.label} ${issues.join('; ')}`] : []
}

export async function checkFrame(page: Page, nodes: FrameNodes, exemptions: FrameExemptions): Promise<FrameResult> {
  await page.evaluate('globalThis.__name = (value) => value')
  await page.evaluate(() => window.scrollTo(0, 0))
  const textExemptions = new Map<string, TextExemption>()
  for (const exemption of exemptions.texts ?? []) textExemptions.set(exemption.figma, exemption)
  const textExemption = (node: TextNode) => textExemptions.get(node.id) ?? textExemptions.get(node.content)
  const shapeExemptions = new Map((exemptions.shapes ?? []).map((exemption) => [exemption.id, exemption]))
  const zOf = (id: string | undefined) => [...nodes.texts, ...nodes.shapes].find((node) => node.id === id)?.z ?? -1
  const inRegions = (node: TextNode | ShapeNode) =>
    !exemptions.regions ||
    exemptions.regions.boxes.some(({ box: [x, y, w, h], above }) => {
      const cx = node.box.x + node.box.w / 2
      const cy = node.box.y + node.box.h / 2
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h && node.z >= zOf(above)
    })
  const texts = nodes.texts.filter((node) => !textExemption(node)?.skip && inRegions(node))
  const shapes = nodes.shapes.filter((node) => !node.mergedInto && !shapeExemptions.get(node.id)?.skip && inRegions(node))
  const output = await page.evaluate(collect, { texts: texts.map((node) => ({ id: node.id, content: node.content, box: node.box, lines: node.lines, app: textExemption(node)?.app ?? null })) })
  const failures: string[] = []
  if (nodes.background && output.background !== nodes.background) failures.push(`page background ${output.background} (figma ${nodes.background})`)
  const anchorIndex = exemptions.shift ? texts.findIndex((node) => node.id === exemptions.shift!.anchor) : -1
  const anchorMeasured = anchorIndex >= 0 ? output.texts[anchorIndex] : null
  const anchorNode = anchorIndex >= 0 ? texts[anchorIndex] : null
  const delta = anchorMeasured && anchorNode ? anchorMeasured.lines[anchorMeasured.lines.length - 1]!.baseline - anchorNode.lines[anchorNode.lines.length - 1]!.baseline : 0
  if (exemptions.shift && !anchorMeasured) failures.push(`shift anchor ${exemptions.shift.anchor} not measured`)
  const shifted = (y: number) => Boolean(exemptions.shift) && y >= exemptions.shift!.from && y < exemptions.shift!.to
  texts.forEach((node, index) => {
    const moved = shifted(node.box.y) && node.id !== exemptions.shift?.anchor ? { ...node, lines: node.lines.map((line) => ({ ...line, baseline: line.baseline + delta })) } : node
    failures.push(...checkText(moved, output.texts[index] ?? null, textExemption(node)))
  })
  for (const shape of shapes) failures.push(...checkShape(shifted(shape.box.y) ? { ...shape, box: { ...shape.box, y: shape.box.y + delta } } : shape, output.paints, shapeExemptions.get(shape.id)))
  const unused = [...textExemptions.keys()].filter((key) => !nodes.texts.some((node) => node.content === key || node.id === key))
  const unusedShapes = [...shapeExemptions.keys()].filter((key) => !nodes.shapes.some((node) => node.id === key))
  for (const key of [...unused, ...unusedShapes]) failures.push(`exemption "${key}" matches no Figma node`)
  const skipped = nodes.texts.length - texts.length + nodes.shapes.filter((node) => !node.mergedInto).length - shapes.length
  return { checked: texts.length + shapes.length, failures, rows: [`${texts.length} texts`, `${shapes.length} shapes`, `${skipped} exempt`] }
}
