// Jednorazowy skrypt audytu: znajdź pliki nieosiągalne z src/routes.
// Uruchom: node scripts/find-dead-code.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const EXTS = ['.ts', '.tsx']
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.tanstack',
  'test-results',
  'playwright-report',
  'android',
  'ios',
])

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (EXTS.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

const all = walk(ROOT).filter((f) => !f.includes('/src/routeTree.gen.ts'))

const importRe = /(?:from\s+|import\()\s*['"]([^'"]+)['"]/g

function resolveImport(fromFile, spec) {
  let base
  if (spec.startsWith('@/')) base = join(ROOT, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else return null
  const candidates = [
    base,
    ...EXTS.map((e) => `${base}${e}`),
    ...EXTS.map((e) => join(base, `index${e}`)),
  ]
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c
    } catch {}
  }
  return null
}

// Wejścia: cały runtime w src/ (root components/lib/hooks są osiągalne przez alias @/)
const entries = all.filter(
  (f) =>
    f.includes('/src/routes/') ||
    f.includes('/src/server/') ||
    f.includes('/src/components/') ||
    f.includes('/src/router.tsx'),
)

const seen = new Set()
const queue = [...entries]
while (queue.length) {
  const file = queue.pop()
  if (seen.has(file)) continue
  seen.add(file)
  let content = ''
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const match of content.matchAll(importRe)) {
    const target = resolveImport(file, match[1])
    if (target && !seen.has(target)) queue.push(target)
  }
}

const dead = all.filter((f) => !seen.has(f) && !f.endsWith('.d.ts'))
const rel = (f) => f.replace(`${ROOT}/`, '')
console.log('Dead files:', dead.length)
for (const f of dead.sort()) console.log(rel(f))
