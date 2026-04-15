# Json2excel — Claude Code Guide

## Project Overview
A Node.js/Express web app that converts JSON (and related formats) to downloadable Excel/CSV files. Two-page flow:
1. **Input page** (`/`) — paste JSON or upload a file
2. **Preview page** (`/table`) — view data in a table, download as CSV or Excel

## Dev Commands
```bash
npm run dev    # start with nodemon (auto-restart), port 3000
npm start      # production start
```

Open `http://localhost:3000` in a browser.

## Architecture Summary
- **Express** server with **EJS** templates
- **express-session** (MemoryStore) passes parsed data from `POST /convert` to `GET /table` — no database needed
- **multer** (memoryStorage) handles file uploads — files are never written to disk
- File upload takes priority over textarea when both are present

## Session Schema
```js
req.session.tableData = {
  data: Array<Object>,       // parsed rows
  columns: Array<string>,    // ordered column names
  count: number,
  originalFilename: string | null,
  parsedAt: number           // Date.now()
}
```

## Code Conventions
- **CommonJS** (`require` / `module.exports`) throughout — no ESM in server files
- EJS templates: use `<% %>` for logic, `<%= %>` for output, `<%- %>` for unescaped HTML
- Never write uploaded files to disk — always use `multer.memoryStorage()`
- Error responses: redirect to `/?error=<message>` (no 4xx JSON responses)
- Services return `{ data, columns, error }` — never throw from service functions

## Input Format Support
| Format | Extension | Parser fn |
|--------|-----------|-----------|
| Raw JSON | textarea | `parseText` |
| JSON file | .json | `parseJsonFile` |
| JS module | .js | `parseJsFile` (vm sandbox) |
| Excel | .xlsx, .xls | `parseExcel` (SheetJS) |
| CSV | .csv | `parseCsv` (csv-parse) |

## Test Matrix
| Input | Expected |
|-------|----------|
| `[{"a":1}]` pasted in textarea | 1 row, column "a" |
| `{"a":1,"b":2}` (single object) | wrapped in array, 2 columns |
| `[]` empty array | 0 rows, error message |
| .json file with array | parsed correctly |
| .js with `module.exports = [...]` | parsed via regex |
| .js with `export default [...]` | parsed via vm sandbox |
| .xlsx first sheet | rows as objects |
| .csv with header row | parsed correctly |
| Unsupported file type | error message |
| Empty submit | error message |

## Critical Files
- `src/services/fileParser.js` — all format parsers; most complex file
- `src/routes/convert.js` — full request lifecycle, both export endpoints
- `src/services/exporter.js` — CSV BOM handling, SheetJS AoA pipeline
