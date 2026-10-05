// ============================================================================
// lib/xlsx.mjs — minimalny czytnik .xlsx (ZIP + XML), bez zależności.
// Obsługuje arkusze z inlineStr oraz sharedStrings. Wystarcza dla eksportów
// Booksy z tego repo.
// ============================================================================
import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50

function findEocd(buf) {
  const min = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i
  }
  throw new Error('Nie znaleziono End of Central Directory (uszkodzony ZIP?)')
}

function readZipEntries(buf) {
  const eocd = findEocd(buf)
  const entryCount = buf.readUInt16LE(eocd + 10)
  let offset = buf.readUInt32LE(eocd + 16)
  const entries = new Map()
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(offset) !== CEN_SIG) throw new Error('Uszkodzony central directory')
    const method = buf.readUInt16LE(offset + 10)
    const compSize = buf.readUInt32LE(offset + 20)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const localOffset = buf.readUInt32LE(offset + 42)
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen)
    entries.set(name, { method, compSize, localOffset })
    offset += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function readEntry(buf, entry) {
  const { method, compSize, localOffset } = entry
  if (buf.readUInt32LE(localOffset) !== LOC_SIG) throw new Error('Uszkodzony local header')
  const nameLen = buf.readUInt16LE(localOffset + 26)
  const extraLen = buf.readUInt16LE(localOffset + 28)
  const start = localOffset + 30 + nameLen + extraLen
  const raw = buf.subarray(start, start + compSize)
  if (method === 0) return raw
  if (method === 8) return inflateRawSync(raw)
  throw new Error(`Nieobsługiwana kompresja ZIP: ${method}`)
}

function decodeXml(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function colToIndex(letters) {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const out = []
  for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = ''
    for (const t of si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += decodeXml(t[1])
    out.push(text)
  }
  return out
}

function parseSheet(xml, sharedStrings) {
  const rows = []
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>|<row[^>]*\/>/g)) {
    const rowXml = rowMatch[1] ?? ''
    const cells = []
    for (const cellMatch of rowXml.matchAll(
      /<c\s+r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const col = colToIndex(cellMatch[1])
      const attrs = cellMatch[3] ?? ''
      const body = cellMatch[4] ?? ''
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      let value = ''
      if (type === 'inlineStr') {
        for (const t of body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) value += decodeXml(t[1])
      } else if (type === 's') {
        const idx = Number.parseInt(/<v>(\d+)<\/v>/.exec(body)?.[1] ?? '-1', 10)
        value = sharedStrings[idx] ?? ''
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
        value = v !== undefined ? decodeXml(v) : ''
      }
      cells[col] = value
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = ''
    rows.push(cells)
  }
  return rows
}

/**
 * Czyta pierwszy arkusz pliku .xlsx.
 * @param {string} path
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function readXlsx(path) {
  const buf = readFileSync(path)
  const entries = readZipEntries(buf)
  const sheetEntry =
    entries.get('xl/worksheets/sheet1.xml') ??
    [...entries.entries()].find(([n]) => n.startsWith('xl/worksheets/sheet'))?.[1]
  if (!sheetEntry) throw new Error('Brak arkusza w pliku xlsx')
  const sharedEntry = entries.get('xl/sharedStrings.xml')
  const shared = sharedEntry ? parseSharedStrings(readEntry(buf, sharedEntry).toString('utf8')) : []
  const rows = parseSheet(readEntry(buf, sheetEntry).toString('utf8'), shared)
  return { headers: rows[0] ?? [], rows: rows.slice(1) }
}

/** Zamienia nagłówki na mapę nazwa -> indeks kolumny. */
export function headerIndex(headers) {
  const map = new Map()
  headers.forEach((h, i) => {
    map.set(h.trim(), i)
  })
  return map
}
