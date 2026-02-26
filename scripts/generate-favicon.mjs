#!/usr/bin/env node
/**
 * Generates favicon assets in public/ from src/assets/brand/icon.webp
 * - favicon.ico (16, 32, 48) – legacy + default for tabs
 * - favicon.webp – modern browsers
 * - apple-touch-icon.png (180×180) – iOS home screen
 * Run: npm run favicon
 */
import sharp from 'sharp'
import { sharpsToIco } from 'sharp-ico'
import { copyFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcIcon = join(root, 'src/assets/brand/icon.webp')
const publicDir = join(root, 'public')

await mkdir(publicDir, { recursive: true })

const resizeOpts = { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }

// Favicon.ico (16, 32, 48 for browser tabs and legacy)
await sharpsToIco([sharp(srcIcon)], join(publicDir, 'favicon.ico'), {
  sizes: [16, 32, 48],
  resizeOptions: resizeOpts,
})
console.log('Wrote public/favicon.ico')

// WebP for modern browsers
await copyFile(srcIcon, join(publicDir, 'favicon.webp'))
console.log('Wrote public/favicon.webp')

// Apple Touch Icon – 180×180 PNG for iOS home screen
await sharp(srcIcon)
  .resize(180, 180, resizeOpts)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'))
console.log('Wrote public/apple-touch-icon.png')
