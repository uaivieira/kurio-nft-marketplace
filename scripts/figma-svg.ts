import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface XmlNode {
  name: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface TextLine {
  text: string
  x: number
  baseline: number
  w: number
}

export interface TextNode {
  id: string
  z: number
  content: string
  lines: TextLine[]
  box: Box
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number | null
  color: string | null
  opacity: number
  clipped: boolean
}

export interface ShapeNode {
  id: string
  z: number
  kind: 'rect' | 'circle' | 'ellipse' | 'line' | 'path'
  box: Box
  radius: number | null
  fill: string | null
  gradient: string[] | null
  image: boolean
  stroke: string | null
  strokeWidth: number | null
  opacity: number
  clipped: boolean
  mergedInto?: string
}

export interface FrameNodes {
  frame: string
  source: string
  width: number
  height: number
  background: string | null
  texts: TextNode[]
  shapes: ShapeNode[]
}

type Matrix = [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const ROBOTO_MONO = { advance: 1229 / 2048, ascent: 2146 / 2048, descent: 555 / 2048 }
const MIN_PATH_SIZE = { w: 40, h: 20 }
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decode(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return String.fromCodePoint(code)
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })
}

export function parseXml(source: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' }
  const stack: XmlNode[] = [root]
  const token = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
  const attribute = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of source.matchAll(token)) {
    const [, cdata, closing, opening, rawAttrs, selfClosing, text] = match
    const parent = stack[stack.length - 1]!
    if (cdata !== undefined) {
      parent.children.push({ name: '#text', attrs: {}, children: [], text: cdata })
    } else if (closing) {
      if (parent.name !== closing) throw new Error(`Unexpected </${closing}> inside <${parent.name}>`)
      stack.pop()
    } else if (opening) {
      const attrs: Record<string, string> = {}
      for (const [, key, double, single] of (rawAttrs ?? '').matchAll(attribute)) attrs[key!] = decode(double ?? single ?? '')
      const node: XmlNode = { name: opening, attrs, children: [], text: '' }
      parent.children.push(node)
      if (!selfClosing) stack.push(node)
    } else if (text !== undefined) {
      parent.children.push({ name: '#text', attrs: {}, children: [], text: decode(text) })
    }
  }
  if (stack.length !== 1) throw new Error(`Unclosed <${stack[stack.length - 1]!.name}>`)
  return root
}

function textContent(node: XmlNode): string {
  return node.name === '#text' ? node.text : node.children.map(textContent).join('')
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]
}

export function parseTransform(value: string | undefined): Matrix {
  let result: Matrix = IDENTITY
  for (const [, kind, args] of (value ?? '').matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const n = args!.split(/[\s,]+/).filter(Boolean).map(Number)
    let next: Matrix = IDENTITY
    if (kind === 'matrix') next = [n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, n[5]!]
    if (kind === 'translate') next = [1, 0, 0, 1, n[0]!, n[1] ?? 0]
    if (kind === 'scale') next = [n[0]!, 0, 0, n[1] ?? n[0]!, 0, 0]
    if (kind === 'skewX') next = [1, 0, Math.tan((n[0]! * Math.PI) / 180), 1, 0, 0]
    if (kind === 'skewY') next = [1, Math.tan((n[0]! * Math.PI) / 180), 0, 1, 0, 0]
    if (kind === 'rotate') {
      const angle = (n[0]! * Math.PI) / 180
      const [cx, cy] = [n[1] ?? 0, n[2] ?? 0]
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      next = multiply(multiply([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]), [1, 0, 0, 1, -cx, -cy])
    }
    result = multiply(result, next)
  }
  return result
}

function apply(matrix: Matrix, box: Box): Box {
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ].map(([x, y]) => [matrix[0] * x! + matrix[2] * y! + matrix[4], matrix[1] * x! + matrix[3] * y! + matrix[5]] as const)
  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

function intersect(a: Box, b: Box): Box | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.w, b.x + b.w)
  const bottom = Math.min(a.y + a.h, b.y + b.h)
  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null
}

function contains(outer: Box, inner: Box) {
  const epsilon = 0.5
  return inner.x >= outer.x - epsilon && inner.y >= outer.y - epsilon && inner.x + inner.w <= outer.x + outer.w + epsilon && inner.y + inner.h <= outer.y + outer.h + epsilon
}

function sameBox(a: Box, b: Box) {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

function roundBox(box: Box): Box {
  return { x: round(box.x), y: round(box.y), w: round(box.w), h: round(box.h) }
}

function num(value: string | undefined, fallback = 0) {
  const parsed = value === undefined ? NaN : parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pathBox(d: string): Box | null {
  const tokens: (string | number)[] = [...d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g)].map(([, command, value]) => command ?? Number(value))
  const xs: number[] = []
  const ys: number[] = []
  let command = 'M'
  let x = 0
  let y = 0
  let start = [0, 0]
  let i = 0
  const read = () => Number(tokens[i++])
  const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
  while (i < tokens.length) {
    if (typeof tokens[i] === 'string') command = tokens[i++] as string
    const upper = command.toUpperCase()
    const relative = command !== upper
    if (upper === 'Z') {
      ;[x, y] = start as [number, number]
      continue
    }
    if (typeof tokens[i] !== 'number') break
    const args = Array.from({ length: arity[upper]! }, read)
    const ox = relative ? x : 0
    const oy = relative ? y : 0
    if (upper === 'H') x = args[0]! + ox
    else if (upper === 'V') y = args[0]! + oy
    else if (upper === 'A') {
      x = args[5]! + ox
      y = args[6]! + oy
    } else {
      for (let k = 0; k < args.length - 2; k += 2) {
        xs.push(args[k]! + ox)
        ys.push(args[k + 1]! + oy)
      }
      x = args[args.length - 2]! + ox
      y = args[args.length - 1]! + oy
    }
    xs.push(x)
    ys.push(y)
    if (upper === 'M') {
      start = [x, y]
      command = relative ? 'l' : 'L'
    }
  }
  if (!xs.length) return null
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
}

function color(value: string | undefined) {
  if (!value || value === 'none') return null
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : value
}

interface Context {
  matrix: Matrix
  clip: Box | null
  clipRadius: number
  opacity: number
  fill: string | undefined
}

export function extractFrame(name: string, svg: string): FrameNodes {
  const root = parseXml(svg).children.find((node) => node.name === 'svg')
  if (!root) throw new Error(`${name}: no <svg> root`)
  const width = num(root.attrs.width)
  const height = num(root.attrs.height)
  const ids = new Map<string, XmlNode>()
  const index = (node: XmlNode) => {
    if (node.attrs.id) ids.set(node.attrs.id, node)
    node.children.forEach(index)
  }
  index(root)
  const reference = (value: string | undefined) => {
    const id = value?.match(/url\(#([^)]+)\)/)?.[1]
    return id ? ids.get(id) : undefined
  }
  const gradientStops = (node: XmlNode) => node.children.filter((child) => child.name === 'stop').map((stop) => `${color(stop.attrs['stop-color']) ?? '#000000'}${stop.attrs['stop-opacity'] ? `/${stop.attrs['stop-opacity']}` : ''}`)

  const texts: TextNode[] = []
  const shapes: ShapeNode[] = []
  let background: string | null = null
  let z = 0

  const clipRadius = (node: XmlNode | undefined) => {
    const rects = node?.children.filter((child) => child.name === 'rect') ?? []
    return rects.length === 1 ? num(rects[0]!.attrs.rx) : 0
  }
  const clipBox = (node: XmlNode | undefined, matrix: Matrix): Box | null => {
    if (!node) return null
    const boxes = node.children
      .filter((child) => child.name === 'rect')
      .map((child) => apply(multiply(matrix, parseTransform(child.attrs.transform)), { x: num(child.attrs.x), y: num(child.attrs.y), w: num(child.attrs.width), h: num(child.attrs.height) }))
    if (!boxes.length) return null
    const x = Math.min(...boxes.map((box) => box.x))
    const y = Math.min(...boxes.map((box) => box.y))
    return { x, y, w: Math.max(...boxes.map((box) => box.x + box.w)) - x, h: Math.max(...boxes.map((box) => box.y + box.h)) - y }
  }

  const pushShape = (node: XmlNode, kind: ShapeNode['kind'], local: Box, context: Context) => {
    const fillAttr = node.attrs.fill ?? context.fill
    const fillRef = reference(fillAttr)
    const strokeColor = color(node.attrs.stroke)
    const strokeWidth = strokeColor ? num(node.attrs['stroke-width'], 1) : null
    const opacity = context.opacity * num(node.attrs.opacity, 1) * num(node.attrs['fill-opacity'], 1)
    const stops = fillRef && fillRef.name.endsWith('Gradient') ? gradientStops(fillRef) : null
    const flat = stops && stops.every((stop) => stop === stops[0] && !stop.includes('/')) ? stops[0]! : null
    const fill = flat ?? (fillRef ? null : color(fillAttr))
    if (!fill && !fillRef && !strokeColor) return
    if (opacity === 0) return
    const grown = strokeWidth && kind !== 'line' ? { x: local.x - strokeWidth / 2, y: local.y - strokeWidth / 2, w: local.w + strokeWidth, h: local.h + strokeWidth } : local
    const box = apply(context.matrix, kind === 'line' && strokeWidth ? (local.w === 0 ? { ...local, x: local.x - strokeWidth / 2, w: strokeWidth } : { ...local, y: local.y - strokeWidth / 2, h: strokeWidth }) : grown)
    if (kind === 'path' && (box.w < MIN_PATH_SIZE.w || box.h < MIN_PATH_SIZE.h)) return
    const visible = context.clip ? intersect(context.clip, box) : box
    if (!visible) return
    if (kind === 'rect' && box.x <= 0 && box.y <= 0 && box.w >= width && box.h >= height) {
      background = fill
      return
    }
    shapes.push({
      id: `s${shapes.length}`,
      z: z++,
      kind,
      box: roundBox(box),
      radius: kind === 'rect' ? round(num(node.attrs.rx, num(node.attrs.ry)) + (strokeWidth ?? 0) / 2 || (context.clip && sameBox(context.clip, box) ? context.clipRadius : 0)) : kind === 'circle' ? round(box.w / 2) : null,
      fill,
      gradient: flat ? null : stops,
      image: fillRef?.name === 'pattern',
      stroke: strokeColor,
      strokeWidth,
      opacity: round(opacity),
      clipped: context.clip ? !contains(context.clip, box) : false,
    })
  }

  const pushText = (node: XmlNode, context: Context) => {
    const fontSize = num(node.attrs['font-size'], 16)
    const weightAttr = node.attrs['font-weight'] ?? 'normal'
    const fontWeight = weightAttr === 'bold' ? 700 : weightAttr === 'normal' ? 400 : num(weightAttr, 400)
    const spacingAttr = node.attrs['letter-spacing'] ?? '0'
    const letterSpacing = round(spacingAttr.endsWith('em') ? num(spacingAttr) * fontSize : num(spacingAttr))
    const scale = Math.hypot(context.matrix[0], context.matrix[1])
    const lines: TextLine[] = []
    for (const span of node.children.filter((child) => child.name === 'tspan')) {
      const raw = textContent(span)
      const text = raw.trim()
      if (!text) continue
      const cell = (ROBOTO_MONO.advance * fontSize + letterSpacing) * scale
      const point = apply(context.matrix, { x: num(span.attrs.x) + ([...raw].length - [...raw.trimStart()].length) * cell, y: num(span.attrs.y), w: 0, h: 0 })
      const advance = [...text].length * cell
      const previous = lines[lines.length - 1]
      if (previous && Math.abs(previous.baseline - point.y) < 0.01 && Math.abs(previous.x + previous.w - point.x) < fontSize) {
        previous.text += `${' '.repeat(Math.round((point.x - previous.x - previous.w) / cell))}${text}`
        previous.w = round(point.x + advance - previous.x)
        continue
      }
      lines.push({ text, x: round(point.x), baseline: round(point.y), w: round(advance) })
    }
    const content = lines.map((line) => line.text).join('\n')
    if (!content) return
    const opacity = context.opacity * num(node.attrs.opacity, 1)
    if (opacity === 0) return
    const ascent = ROBOTO_MONO.ascent * fontSize * scale
    const descent = ROBOTO_MONO.descent * fontSize * scale
    const top = Math.min(...lines.map((line) => line.baseline)) - ascent
    const bottom = Math.max(...lines.map((line) => line.baseline)) + descent
    const left = Math.min(...lines.map((line) => line.x))
    const right = Math.max(...lines.map((line) => line.x + line.w))
    const box = { x: left, y: top, w: right - left, h: bottom - top }
    const visible = context.clip ? intersect(context.clip, box) : box
    if (!visible) return
    const gaps = lines.slice(1).map((line, i) => line.baseline - lines[i]!.baseline)
    const fill = node.attrs.fill ?? context.fill
    texts.push({
      id: `t${texts.length}`,
      z: z++,
      content,
      lines,
      box: roundBox(box),
      fontFamily: node.attrs['font-family'] ?? '',
      fontSize: round(fontSize * scale),
      fontWeight,
      letterSpacing,
      lineHeight: gaps.length ? round(Math.min(...gaps)) : null,
      color: reference(fill) ? null : color(fill),
      opacity: round(opacity),
      clipped: context.clip ? !contains(context.clip, box) : false,
    })
  }

  const walk = (node: XmlNode, parent: Context) => {
    if (node.name === 'defs' || node.name === 'clipPath' || node.name === 'mask' || node.name === 'pattern' || node.name === 'filter') return
    const matrix = multiply(parent.matrix, parseTransform(node.attrs.transform))
    const ownClip = clipBox(reference(node.attrs['clip-path']), matrix)
    const clip = ownClip ? (parent.clip ? intersect(parent.clip, ownClip) : ownClip) : parent.clip
    if (ownClip && !clip) return
    const context: Context = { matrix, clip, clipRadius: ownClip ? clipRadius(reference(node.attrs['clip-path'])) : parent.clipRadius, opacity: parent.opacity * (node.name === 'g' ? num(node.attrs.opacity, 1) : 1), fill: node.name === 'g' ? (node.attrs.fill ?? parent.fill) : parent.fill }
    const a = node.attrs
    if (node.name === 'text') return pushText(node, context)
    if (node.name === 'rect') pushShape(node, 'rect', { x: num(a.x), y: num(a.y), w: num(a.width), h: num(a.height) }, context)
    if (node.name === 'circle') pushShape(node, 'circle', { x: num(a.cx) - num(a.r), y: num(a.cy) - num(a.r), w: num(a.r) * 2, h: num(a.r) * 2 }, context)
    if (node.name === 'ellipse') pushShape(node, 'ellipse', { x: num(a.cx) - num(a.rx), y: num(a.cy) - num(a.ry), w: num(a.rx) * 2, h: num(a.ry) * 2 }, context)
    if (node.name === 'line') {
      const [x1, y1, x2, y2] = [num(a.x1), num(a.y1), num(a.x2), num(a.y2)]
      pushShape(node, 'line', { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }, context)
    }
    if (node.name === 'path') {
      const box = pathBox(a.d ?? '')
      if (box) pushShape(node, 'path', box, context)
    }
    for (const child of node.children) walk(child, context)
  }

  const near = (a: Box, b: Box, grow: number) => Math.abs(a.x - grow - b.x) < 0.6 && Math.abs(a.y - grow - b.y) < 0.6 && Math.abs(a.w + grow * 2 - b.w) < 0.6 && Math.abs(a.h + grow * 2 - b.h) < 0.6
  const merge = () => {
    for (const fillShape of shapes) {
      if (!fillShape.fill || fillShape.stroke || fillShape.kind === 'line') continue
      const outline = shapes.find((other) => other !== fillShape && other.kind === fillShape.kind && other.stroke && !other.fill && !other.gradient && !other.image && (near(fillShape.box, other.box, 0) || near(fillShape.box, other.box, (other.strokeWidth ?? 0) / 2)))
      if (!outline) continue
      outline.fill = fillShape.fill
      fillShape.mergedInto = outline.id
    }
  }
  for (const child of root.children) walk(child, { matrix: parseTransform(root.attrs.transform), clip: { x: 0, y: 0, w: width, h: height }, clipRadius: 0, opacity: 1, fill: undefined })
  merge()
  return { frame: name, source: `figma/svg/${name}.svg`, width, height, background, texts, shapes }
}

async function main() {
  const directory = path.resolve('figma/svg')
  const filter = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  const files = (await readdir(directory)).filter((file) => file.endsWith('.svg') && (!filter || file.includes(filter))).sort()
  for (const file of files) {
    const name = path.basename(file, '.svg')
    const nodes = extractFrame(name, await readFile(path.join(directory, file), 'utf8'))
    await writeFile(path.resolve('figma/nodes', `${name}.json`), `${JSON.stringify(nodes, null, 1)}\n`)
    console.log(`${name.padEnd(22)} ${String(nodes.texts.length).padStart(4)} texts ${String(nodes.shapes.length).padStart(4)} shapes`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
