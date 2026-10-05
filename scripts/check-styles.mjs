// Guard spójności stylowania: blokuje palety Tailwind i arbitralne kolory hex
// w żywych katalogach. Uruchamiany przez `pnpm lint:styles` (i w CI).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const TARGET_DIRS = ['src', 'components/admin', 'components/client', 'components/ui']
const EXTS = ['.tsx', '.ts']
const SKIP = new Set(['node_modules', 'dist', '.git', '.tanstack'])

// Kolory palet Tailwind (bez tokenów semantycznych)
const PALETTE =
  /(?:^|[\s'"`:])(?:bg|text|border|ring|from|via|to|fill|stroke|decoration|outline|shadow|accent|caret|divide)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g

// Arbitralne kolory hex w klasach (bg-[#...] itp.)
const ARBITRARY_HEX = /(?:bg|text|border|ring|from|via|to|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g

// Wyjątki: nakładki na zdjęciach (biały tekst na ciemnym overlayu)
const ALLOW_LINES = [/text-white/, /bg-black\//, /bg-white\/(?:80|90|95)/]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (EXTS.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

const problems = []
for (const dir of TARGET_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (ALLOW_LINES.some((re) => re.test(line))) return
      for (const re of [PALETTE, ARBITRARY_HEX]) {
        re.lastIndex = 0
        const match = re.exec(line)
        if (match) {
          problems.push(`${relative(ROOT, file)}:${i + 1} — ${match[0]}`)
        }
      }
    })
  }
}

if (problems.length > 0) {
  console.error('Znaleziono niedozwolone klasy kolorów (użyj tokenów semantycznych):')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log('check-styles: OK')
