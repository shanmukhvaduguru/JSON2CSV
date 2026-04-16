// Replicates GitHub Pages locally (cross-platform: Windows + Mac + Linux)
// Usage: node scripts/preview-ghpages.js
import { execSync }              from 'child_process'
import { rmSync, mkdirSync, cpSync } from 'fs'
import { join }                  from 'path'

const root    = process.cwd()
const distDir = join(root, 'dist')
const ghDir   = join(root, '.ghpages-local')
const outDir  = join(ghDir, 'JSON2CSV')

// 1. Build with the GitHub Pages base path (/JSON2CSV/)
console.log('\n[1/3] Building with GitHub Pages base path...')
execSync('npx vite build', {
  stdio: 'inherit',
  env: { ...process.env, GITHUB_ACTIONS: 'true' },
})

// 2. Copy dist/ → .ghpages-local/JSON2CSV/  (mirrors GitHub's file layout)
console.log('\n[2/3] Setting up local GitHub Pages folder...')
rmSync(ghDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(distDir, outDir, { recursive: true })
console.log(`      dist/ → .ghpages-local/JSON2CSV/  ✓`)

// 3. Serve from root — exactly like github.io serves your repo under /JSON2CSV/
console.log('\n[3/3] Starting static server (same as GitHub Pages / nginx)...')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Local GitHub Pages URL: http://localhost:8080/JSON2CSV/')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
execSync('npx serve .ghpages-local --listen 8080', { stdio: 'inherit' })
