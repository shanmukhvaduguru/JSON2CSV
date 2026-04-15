# Json2Excel — Feature Specification

## 1. User Stories

| # | Story |
|---|-------|
| US-1 | As a user, I want to paste JSON text and see it as a table so I can verify the data before exporting. |
| US-2 | As a user, I want to upload a `.json` file and have it parsed automatically. |
| US-3 | As a user, I want to upload a `.js` file that exports an array/object and have it parsed. |
| US-4 | As a user, I want to upload an Excel (`.xlsx` / `.xls`) file and view its first sheet as a table. |
| US-5 | As a user, I want to upload a `.csv` file and preview its data as a table. |
| US-6 | As a user, I want to export the previewed data as a `.csv` file. |
| US-7 | As a user, I want to export the previewed data as an Excel `.xlsx` file. |
| US-8 | As a user, I want to see a clear error message if my input is invalid. |
| US-9 | As a user, I want to click a column header to sort the table. |
| US-10 | As a user, I want to start a new conversion without losing my current preview session. |

---

## 2. Input Formats

| Format | Extension | Parser Function | Notes |
|--------|-----------|-----------------|-------|
| Raw JSON (textarea) | — | `parseText` | `JSON.parse()`, wraps single `{}` in array |
| JSON file | `.json` | `parseJsonFile` | Same as textarea after `buffer.toString('utf8')` |
| JavaScript module | `.js` | `parseJsFile` | Three-pass: regex → vm sandbox → error |
| Excel (modern) | `.xlsx` | `parseExcel` | SheetJS, reads first sheet only |
| Excel (legacy) | `.xls` | `parseExcel` | SheetJS, reads first sheet only |
| CSV | `.csv` | `parseCsv` | csv-parse with `columns: true` |

### JS File Parsing Detail
The `.js` parser supports these export patterns:
- `module.exports = [...]`
- `module.exports = {...}`
- `export default [...]`
- `export default {...}`
- `const/let/var name = [...]`

**Pass 1** — Regex extraction + `JSON.parse` (handles clean JSON-compatible literals)
**Pass 2** — `vm.Script` sandbox with ESM→CJS rewrite (handles trailing commas, template literals, comments)
**Pass 3** — Returns descriptive error

---

## 3. Output Formats

| Format | MIME Type | BOM | Filename |
|--------|-----------|-----|----------|
| CSV | `text/csv; charset=utf-8` | UTF-8 BOM (`\uFEFF`) | `export.csv` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | N/A | `export.xlsx` |

**CSV BOM:** The UTF-8 BOM prefix ensures Excel opens the file without showing encoding errors (especially for non-ASCII characters).

**Excel column widths:** Auto-sized using the maximum character length of each column's values, capped at 60 characters.

---

## 4. Error States

| Trigger | User-Facing Message |
|---------|---------------------|
| Both textarea empty and no file | `Please paste JSON text or select a file before converting.` (client-side) |
| Invalid JSON syntax | `Invalid JSON: <parser error message>` |
| Unsupported file extension | `Unsupported file type. Allowed: .json, .js, .xlsx, .xls, .csv` |
| File over 10 MB | `File too large. Maximum size is 10 MB.` |
| JS file — cannot extract data | `Could not extract data from JS file. Ensure it uses module.exports = [...] or export default [...]` |
| JS file — VM execution error | `Could not execute JS file: <error>` |
| Empty parsed result | `No data rows found. The input appears to be empty.` |
| Excel file unreadable | `Could not read Excel file: <error>` |
| CSV parse error | `Could not parse CSV: <error>` |
| Accessing /table without session | Redirect to `/` |
| Accessing /export/* without session | Redirect to `/` |

---

## 5. Session Lifecycle

1. **Created/overwritten** on `POST /convert` — stores `{ data, columns, count, originalFilename, parsedAt }`
2. **Read** on `GET /table`, `GET /export/csv`, `GET /export/excel`
3. **Expires** after 30 minutes of inactivity (cookie `maxAge`)
4. **Destroyed implicitly** when Express MemoryStore expires it
5. **Overwritten** on each new `POST /convert` — old data is replaced immediately

---

## 6. Constraints & Limits

| Constraint | Value |
|------------|-------|
| Max upload size | 10 MB |
| Session TTL | 30 minutes |
| Excel sheets read | First sheet only |
| CSV encoding expected | UTF-8 |
| JS execution timeout (vm) | 2 seconds |
| Nested object support | Flat only (nested objects rendered as `[object Object]`) |

---

## 7. Edge Cases

| Case | Behaviour |
|------|-----------|
| Single `{}` object (not array) | Wrapped in `[{}]` — treated as one-row table |
| Array with mixed keys across rows | Union of all keys used as columns; missing values shown as empty |
| Empty array `[]` | Error: "No data rows found" |
| Array containing non-object items | Non-object items filtered out; if none remain, error shown |
| Unicode column names | Supported — UTF-8 throughout |
| Very large number of columns | Table scrolls horizontally inside `.table-wrapper` |
| Deeply nested objects | Rendered as `[object Object]` — no automatic flattening |
| JS file with trailing commas | Handled by vm sandbox (Pass 2) |
| Excel file with empty cells | Rendered as empty string (`defval: ''` in SheetJS) |
| CSV with quoted fields containing commas | Handled by csv-parse RFC 4180 parser |
