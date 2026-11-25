/**
 * Converts the artwork exported from Figma (assets-src/nft/*.png) into
 * responsive AVIF/WebP variants served from public/nft/.
 * Run with `pnpm assets`; the output is committed so builds need no image tooling.
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = path.resolve('assets-src/nft')
const OUTPUT_DIR = path.resolve('public/nft')
const WIDTHS = [160, 320, 480] as const

await mkdir(OUTPUT_DIR, { recursive: true })

for (const file of await readdir(SOURCE_DIR)) {
  if (!file.endsWith('.png')) continue
  const name = path.basename(file, '.png')
  const source = sharp(path.join(SOURCE_DIR, file))
  for (const width of WIDTHS) {
    const resized = source.clone().resize(width, width, { fit: 'cover' })
    await resized.clone().avif({ quality: 55 }).toFile(path.join(OUTPUT_DIR, `${name}-${width}.avif`))
    await resized.clone().webp({ quality: 78 }).toFile(path.join(OUTPUT_DIR, `${name}-${width}.webp`))
  }
  console.log(`processed ${name}`)
}
