import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// ── Public API ──────────────────────────────────────────────────────────────

export function parseText(text) {
  let parsed
  try { parsed = JSON.parse(text) }
  catch (e) { return { error: 'Invalid JSON: ' + e.message } }
  return normalise(parsed)
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'json') return parseText(await readText(file))
  if (ext === 'js')   return parseJs(await readText(file))
  if (ext === 'csv')  return parseCsv(await readText(file))
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(await readBinary(file))

  return { error: 'Unsupported file type. Supported: .json  .js  .xlsx  .xls  .csv' }
}

// ── Format parsers ──────────────────────────────────────────────────────────

function parseJs(text) {
  // Three-pass regex — mirrors the server-side vm.Script approach
  const patterns = [
    /module\.exports\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m,
    /export\s+default\s+(\[[\s\S]*?\])\s*;?\s*$/m,
    /(?:const|let|var)\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;/,
    /module\.exports\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/m,
    /export\s+default\s+(\{[\s\S]*?\})\s*;?\s*$/m,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) { try { return normalise(JSON.parse(m[1])) } catch (_) {} }
  }
  // Last resort: find any JSON array in the file
  const arrMatch = text.match(/(\[[\s\S]*\])/)
  if (arrMatch) { try { return normalise(JSON.parse(arrMatch[1])) } catch (_) {} }
  return { error: 'Could not extract data from .js file. Ensure it exports an array of objects via module.exports or export default.' }
}

function parseCsv(text) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, dynamicTyping: false })
  if (result.errors.length > 0 && result.data.length === 0) {
    return { error: 'CSV parse error: ' + result.errors[0].message }
  }
  return normalise(result.data)
}

function parseExcel(buf) {
  try {
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
    return normalise(data)
  } catch (e) {
    return { error: 'Failed to read Excel file: ' + e.message }
  }
}

// ── Shared normaliser ───────────────────────────────────────────────────────

function normalise(parsed) {
  let rows
  if (Array.isArray(parsed))                          rows = parsed
  else if (parsed && typeof parsed === 'object')      rows = [parsed]
  else return { error: 'Input must be a JSON object or array of objects.' }

  const valid = rows.filter(r => r && typeof r === 'object' && !Array.isArray(r))
  if (valid.length === 0) return { error: 'No valid objects found in input.' }

  const colSet = new Set()
  valid.forEach(row => Object.keys(row).forEach(k => colSet.add(k)))

  return { data: valid, columns: [...colSet], error: null }
}

// ── File reading ────────────────────────────────────────────────────────────

function readText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(e.target.result)
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsText(file, 'UTF-8')
  })
}

function readBinary(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(new Uint8Array(e.target.result))
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsArrayBuffer(file)
  })
}
