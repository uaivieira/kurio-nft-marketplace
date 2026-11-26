import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { LanguageVariant, SyntaxKind } from 'typescript/unstable/ast'
import { createScanner, type Scanner } from 'typescript/unstable/ast/scanner'

export interface CommentRange {
  start: number
  end: number
}

const ROOT = path.resolve(import.meta.dirname, '..')
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', '.vercel', '.lighthouseci', 'playwright-report', 'test-results', '__screenshots__'])
const SKIPPED_PATHS = new Set(['src/routeTree.gen.ts', 'lighthouse/reports', 'figma/report'])
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

const TRIVIA = new Set([SyntaxKind.WhitespaceTrivia, SyntaxKind.NewLineTrivia, SyntaxKind.ConflictMarkerTrivia])
const COMMENTS = new Set([SyntaxKind.SingleLineCommentTrivia, SyntaxKind.MultiLineCommentTrivia])
const EXPRESSION_ENDS = new Set([
  SyntaxKind.Identifier,
  SyntaxKind.PrivateIdentifier,
  SyntaxKind.NumericLiteral,
  SyntaxKind.BigIntLiteral,
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateTail,
  SyntaxKind.RegularExpressionLiteral,
  SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken,
  SyntaxKind.CloseBraceToken,
  SyntaxKind.ThisKeyword,
  SyntaxKind.SuperKeyword,
  SyntaxKind.TrueKeyword,
  SyntaxKind.FalseKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.PlusPlusToken,
  SyntaxKind.MinusMinusToken,
])

type Frame = 'brace' | 'template' | 'stop'

class CodeScanner {
  readonly comments: CommentRange[] = []
  private readonly scanner: Scanner
  private readonly frames: Frame[] = []
  private endsExpression = false
  private lookingAhead = false
  private readonly jsx: boolean

  constructor(text: string, jsx: boolean) {
    this.jsx = jsx
    this.scanner = createScanner(false, jsx ? LanguageVariant.JSX : LanguageVariant.Standard, text)
  }

  run() {
    this.scanCode(false)
    return this.comments
  }

  private record() {
    if (this.lookingAhead) return
    this.comments.push({ start: this.scanner.getTokenStart(), end: this.scanner.getTokenEnd() })
  }

  private nextSignificant(scan: () => SyntaxKind = () => this.scanner.scan()): SyntaxKind {
    for (;;) {
      const kind = scan()
      if (COMMENTS.has(kind)) this.record()
      else if (!TRIVIA.has(kind)) return kind
    }
  }

  private scanCode(untilClosingBrace: boolean) {
    if (untilClosingBrace) this.frames.push('stop')
    for (;;) {
      let kind = this.nextSignificant()
      if (kind === SyntaxKind.EndOfFile) return
      if ((kind === SyntaxKind.SlashToken || kind === SyntaxKind.SlashEqualsToken) && !this.endsExpression) kind = this.scanner.reScanSlashToken()
      if (kind === SyntaxKind.TemplateHead) this.frames.push('template')
      else if (kind === SyntaxKind.OpenBraceToken) this.frames.push('brace')
      else if (kind === SyntaxKind.CloseBraceToken) {
        const frame = this.frames.pop()
        if (frame === 'stop') {
          this.endsExpression = true
          return
        }
        if (frame === 'template') {
          kind = this.scanner.reScanTemplateToken(false)
          if (kind === SyntaxKind.TemplateMiddle) this.frames.push('template')
        }
      } else if (kind === SyntaxKind.LessThanToken && this.jsx && !this.endsExpression && this.startsJsxElement()) {
        this.scanJsxElement()
        this.endsExpression = true
        continue
      }
      this.endsExpression = EXPRESSION_ENDS.has(kind) || (this.scanner.isIdentifier() && !this.scanner.isReservedWord())
    }
  }

  private startsJsxElement() {
    this.lookingAhead = true
    try {
      return this.scanner.lookAhead(() => {
        const first = this.nextSignificant()
        if (first === SyntaxKind.GreaterThanToken) return true
        if (first !== SyntaxKind.Identifier && !(first >= SyntaxKind.FirstKeyword && first <= SyntaxKind.LastKeyword)) return false
        const second = this.nextSignificant()
        return second !== SyntaxKind.ExtendsKeyword && second !== SyntaxKind.CommaToken
      })
    } finally {
      this.lookingAhead = false
    }
  }

  private scanJsxElement() {
    let kind = this.nextSignificant()
    if (kind !== SyntaxKind.GreaterThanToken) {
      this.scanner.scanJsxIdentifier()
      for (;;) {
        kind = this.nextSignificant()
        if (kind === SyntaxKind.GreaterThanToken) break
        if (kind === SyntaxKind.EndOfFile) return
        if (kind === SyntaxKind.SlashToken) {
          this.nextSignificant()
          return
        }
        if (kind === SyntaxKind.OpenBraceToken) this.scanCode(true)
        else if (kind === SyntaxKind.EqualsToken) {
          const value = this.nextSignificant(() => this.scanner.scanJsxAttributeValue())
          if (value === SyntaxKind.OpenBraceToken) this.scanCode(true)
          else if (value === SyntaxKind.LessThanToken) this.scanJsxElement()
        } else this.scanner.scanJsxIdentifier()
      }
    }
    this.scanJsxChildren()
  }

  private scanJsxChildren() {
    for (;;) {
      const kind = this.scanner.scanJsxToken()
      if (kind === SyntaxKind.EndOfFile) return
      if (kind === SyntaxKind.OpenBraceToken) this.scanCode(true)
      else if (kind === SyntaxKind.LessThanToken) this.scanJsxElement()
      else if (kind === SyntaxKind.LessThanSlashToken) {
        for (;;) {
          const closing = this.nextSignificant()
          if (closing === SyntaxKind.GreaterThanToken || closing === SyntaxKind.EndOfFile) return
          this.scanner.scanJsxIdentifier()
        }
      }
    }
  }
}

function cssComments(text: string): CommentRange[] {
  const comments: CommentRange[] = []
  let quote: string | null = null
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!
    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
    } else if (char === '"' || char === "'") quote = char
    else if (text.startsWith('/*', index)) {
      const close = text.indexOf('*/', index + 2)
      const end = close === -1 ? text.length : close + 2
      comments.push({ start: index, end })
      index = end - 1
    }
  }
  return comments
}

function htmlComments(text: string): CommentRange[] {
  const comments: CommentRange[] = []
  for (let start = text.indexOf('<!--'); start !== -1; start = text.indexOf('<!--', start + 4)) {
    const close = text.indexOf('-->', start + 4)
    comments.push({ start, end: close === -1 ? text.length : close + 3 })
  }
  return comments
}

export function findComments(text: string, file: string): CommentRange[] {
  const extension = path.extname(file)
  if (extension === '.css') return cssComments(text)
  if (extension === '.html') return htmlComments(text)
  if (CODE_EXTENSIONS.has(extension)) return new CodeScanner(text, extension === '.tsx' || extension === '.jsx').run()
  return []
}

export function sourceFiles(directory = ROOT): string[] {
  const files: string[] = []
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name)
    const relative = path.relative(ROOT, full).split(path.sep).join('/')
    if (SKIPPED_PATHS.has(relative)) continue
    if (statSync(full).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(name) && !name.startsWith('dist')) files.push(...sourceFiles(full))
    } else if (CODE_EXTENSIONS.has(path.extname(name)) || name.endsWith('.css') || name.endsWith('.html')) files.push(full)
  }
  return files
}

function main() {
  const targets = process.argv.slice(2)
  const files = targets.length ? targets.map((target) => path.resolve(target)) : sourceFiles()
  const findings: string[] = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const comment of findComments(text, file)) {
      const before = text.slice(0, comment.start).split('\n')
      const snippet = text.slice(comment.start, comment.end).split('\n')[0]!.slice(0, 80)
      findings.push(`${path.relative(ROOT, file)}:${before.length}:${before.at(-1)!.length + 1} ${snippet}`)
    }
  }
  if (findings.length) {
    console.error(`Comments are not allowed in source files (${findings.length} found):\n${findings.join('\n')}`)
    process.exit(1)
  }
  console.log(`No comments in ${files.length} source files.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
