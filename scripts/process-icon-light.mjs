#!/usr/bin/env node
/**
 * Processes src/assets/brand/icon-light.png into compressed WebP and PNG,
 * matching the treatment of the other brand icons.
 * Outputs: src/assets/brand/icon-light.webp, icon-light.png (compressed)
 *
 * Usage: npm run icon-light
 */
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcPath = join(root, 'src/assets/brand/icon-light.png')
const outDir = join(root, 'src/assets/brand')

const input = await readFile(srcPath)
const pipeline = sharp(input)

// WebP – same settings as logo script (quality 90, effort 6, alpha)
await pipeline
  .clone()
  .webp({ quality: 90, effort: 6, alphaQuality: 100 })
  .toFile(join(outDir, 'icon-light.webp'))
console.log('Wrote src/assets/brand/icon-light.webp')

// Compressed PNG (lossless compression level 9)
await pipeline
  .clone()
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, 'icon-light.png'))
console.log('Wrote src/assets/brand/icon-light.png (compressed)')
