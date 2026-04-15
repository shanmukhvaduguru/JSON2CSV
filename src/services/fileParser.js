const vm = require('vm');
const XLSX = require('xlsx');
const { parse: csvParse } = require('csv-parse/sync');

/**
 * Normalise any parsed value into { data: Array<Object>, columns: string[], error: null }
 */
function normalise(input) {
  if (!Array.isArray(input)) {
    if (input !== null && typeof input === 'object') {
      input = [input];
    } else {
      return { data: [], columns: [], error: 'Input must be a JSON array or object.' };
    }
  }

  const filtered = input.filter(item => item !== null && typeof item === 'object' && !Array.isArray(item));

  if (filtered.length === 0) {
    return { data: [], columns: [], error: 'No valid objects found in input.' };
  }

  const columns = [...new Set(filtered.flatMap(row => Object.keys(row)))];

  return { data: filtered, columns, error: null };
}

/**
 * Parse raw JSON text (from textarea)
 */
function parseText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { data: [], columns: [], error: 'Invalid JSON: ' + e.message };
  }
  return normalise(parsed);
}

/**
 * Parse a .json file buffer
 */
function parseJsonFile(buffer) {
  return parseText(buffer.toString('utf8'));
}

/**
 * Parse a .js file buffer using three-pass strategy:
 *  1. Regex extraction + JSON.parse
 *  2. vm.Script sandbox
 *  3. Error
 */
function parseJsFile(buffer) {
  const src = buffer.toString('utf8');

  // Pass 1: Regex patterns — try to extract a JSON-serialisable array/object literal
  const patterns = [
    /module\.exports\s*=\s*(\[[\s\S]*\])\s*;?\s*$/m,
    /module\.exports\s*=\s*(\{[\s\S]*\})\s*;?\s*$/m,
    /export\s+default\s+(\[[\s\S]*\])\s*;?\s*$/m,
    /export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/m,
    /(?:const|let|var)\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;/,
    /(?:const|let|var)\s+\w+\s*=\s*(\{[\s\S]*?\})\s*;/,
  ];

  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return normalise(parsed);
      } catch (_) {
        // Not valid JSON (e.g. trailing commas, comments) — continue to next pass
      }
    }
  }

  // Pass 2: vm.Script sandbox
  try {
    const rewritten = src
      .replace(/^export\s+default\s+/m, 'module.exports = ')
      .replace(/^export\s+const\s+(\w+)\s*=/m, 'module.exports =')
      .replace(/^export\s+let\s+(\w+)\s*=/m, 'module.exports =')
      .replace(/^export\s+var\s+(\w+)\s*=/m, 'module.exports =');

    const script = new vm.Script(rewritten);
    const ctx = vm.createContext({
      module: { exports: {} },
      exports: {}
    });
    script.runInContext(ctx, { timeout: 2000 });
    const result = ctx.module.exports;

    if (Array.isArray(result) || (result !== null && typeof result === 'object')) {
      return normalise(result);
    }
  } catch (e) {
    return {
      data: [], columns: [],
      error: `Could not execute JS file: ${e.message}. Ensure it uses module.exports = [...] or export default [...]`
    };
  }

  return {
    data: [], columns: [],
    error: 'Could not extract data from JS file. Ensure it uses module.exports = [...] or export default [...]'
  };
}

/**
 * Parse a .xlsx or .xls file buffer using SheetJS
 */
function parseExcel(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (e) {
    return { data: [], columns: [], error: 'Could not read Excel file: ' + e.message };
  }

  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return { data: [], columns: [], error: 'Excel file has no sheets.' };
  }

  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false
  });

  return normalise(data);
}

/**
 * Parse a .csv file buffer using csv-parse
 */
function parseCsv(buffer) {
  let records;
  try {
    records = csvParse(buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (e) {
    return { data: [], columns: [], error: 'Could not parse CSV: ' + e.message };
  }
  return normalise(records);
}

/**
 * Main entry point.
 * @param {{ type: string, buffer: Buffer|null, text: string|null, originalname: string|null }} source
 * @returns {{ data: Array<Object>, columns: string[], error: string|null }}
 */
function parse(source) {
  try {
    switch (source.type) {
      case 'text': return parseText(source.text);
      case 'json': return parseJsonFile(source.buffer);
      case 'js':   return parseJsFile(source.buffer);
      case 'xlsx':
      case 'xls':  return parseExcel(source.buffer);
      case 'csv':  return parseCsv(source.buffer);
      default:
        return { data: [], columns: [], error: `Unsupported input type: ${source.type}` };
    }
  } catch (err) {
    return { data: [], columns: [], error: 'Unexpected error: ' + err.message };
  }
}

module.exports = { parse };
