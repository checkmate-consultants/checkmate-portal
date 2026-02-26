#!/usr/bin/env node
/**
 * Generates logo-light.webp from a PDF source (Vector-2.pdf for light backgrounds).
 * Output: src/assets/brand/logo-light.webp
 *
 * Uses macOS qlmanage to render the PDF, then sharp to convert to WebP.
 * On Linux: install ImageMagick (convert) or poppler-utils (pdftoppm).
 *
 * Usage:
 *   npm run logo
 *   npm run logo -- /path/to/Vector-2.pdf
 */
import { mkdir, readFile, unlink } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const defaultPdfPath = join(
  process.env.HOME || '',
  'Downloads/Checkmate (1)/Logo Source/Vector-2.pdf',
)
const pdfPath = process.argv[2] || defaultPdfPath
const outDir = join(root, 'src/assets/brand')
const outPath = join(outDir, 'logo-light.webp')

await mkdir(outDir, { recursive: true })

let pngPath
const isMac = process.platform === 'darwin'

if (isMac) {
  pngPath = join(tmpdir(), `logo-${Date.now()}.png`)
  execSync(`qlmanage -t -s 520 -o ${tmpdir()} "${pdfPath}"`, {
    stdio: 'pipe',
  })
  const qlPng = join(tmpdir(), `${pdfPath.split('/').pop()}.png`)
  const { rename } = await import('fs/promises')
  await rename(qlPng, pngPath)
} else {
  try {
    pngPath = join(tmpdir(), `logo-${Date.now()}.png`)
    execSync(`convert -density 300 "${pdfPath}[0]" -flatten "${pngPath}"`, {
      stdio: 'pipe',
    })
  } catch {
    throw new Error(
      'PDF rendering requires ImageMagick. Install with: brew install imagemagick (macOS) or apt install imagemagick (Linux)',
    )
  }
}

const pngBuffer = await readFile(pngPath)
await unlink(pngPath).catch(() => {})

// Make white background transparent
const { data, info } = await sharp(pngBuffer)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const threshold = 250 // Pixels with r,g,b all >= this become transparent

for (let i = 0; i < data.length; i += channels) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (r >= threshold && g >= threshold && b >= threshold) {
    data[i + 3] = 0
  }
}

await sharp(data, { raw: { width, height, channels } })
  .webp({ quality: 90, effort: 6, alphaQuality: 100 })
  .toFile(outPath)

console.log(`Wrote ${outPath}`)
