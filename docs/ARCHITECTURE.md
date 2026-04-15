# Json2Excel — Architecture

## Overview

Json2Excel is a two-page Node.js/Express web application. It accepts JSON-like data in various input formats, normalises it into a flat array of objects, stores it in a server-side session, and provides table preview and file export functionality.

---

## Directory Structure

```
Json2excel/
├── src/
│   ├── index.js               Express app bootstrap
│   ├── routes/
│   │   ├── index.js           GET /
│   │   └── convert.js         POST /convert, GET /table, GET /export/*
│   ├── services/
│   │   ├── fileParser.js      All input format parsers
│   │   └── exporter.js        CSV and Excel export
│   ├── views/
│   │   ├── index.ejs          Input page
│   │   └── table.ejs          Preview + export page
│   └── public/
│       ├── css/style.css      Styles
│       └── js/app.js          Client-side interactivity
├── spec/SPEC.md               Feature specification
├── docs/ARCHITECTURE.md       This file
├── CLAUDE.md                  Conventions for Claude Code
├── .cursorrules               Editor AI conventions
├── package.json
└── .gitignore
```

---

## Request Flow

```
Browser                    Express                       Services
  │                           │                              │
  │── GET /  ────────────────▶│                              │
  │◀── 200 index.ejs ─────────│                              │
  │                           │                              │
  │── POST /convert ─────────▶│                              │
  │  (multipart/form-data)    │── fileParser.parse(source) ─▶│
  │                           │◀── { data, columns } ────────│
  │                           │                              │
  │                           │  req.session.tableData = {   │
  │                           │    data, columns, count,     │
  │                           │    originalFilename, parsedAt│
  │                           │  }                           │
  │◀── 302 /table ────────────│                              │
  │                           │                              │
  │── GET /table ────────────▶│                              │
  │◀── 200 table.ejs ─────────│                              │
  │                           │                              │
  │── GET /export/csv ───────▶│                              │
  │                           │── exporter.toCSV() ─────────▶│
  │◀── 200 CSV stream ────────│◀── string (with BOM) ────────│
  │                           │                              │
  │── GET /export/excel ─────▶│                              │
  │                           │── exporter.toExcel() ───────▶│
  │◀── 200 XLSX stream ───────│◀── Buffer ───────────────────│
```

---

## Middleware Stack (in order)

```
express.static()         — serves /public assets before any route runs
express.urlencoded()     — parses application/x-www-form-urlencoded bodies
express.json()           — parses application/json bodies
express-session()        — attaches req.session (MemoryStore)
indexRouter              — handles GET /
convertRouter            — handles POST /convert, GET /table, GET /export/*
404 handler
500 error handler
```

> **Order matters:** `express-session` must be mounted before any route that reads or writes `req.session`.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌──────────────┐        ┌─────────────────────────────────┐    │
│  │  index.ejs   │        │  table.ejs                      │    │
│  │  - Textarea  │        │  - HTML table (rows/columns)    │    │
│  │  - File drop │        │  - Sort on column click (JS)    │    │
│  │  - Submit    │        │  - Download CSV / Excel buttons │    │
│  └──────┬───────┘        └──────────────────────┬──────────┘    │
│         │ POST /convert                          │ GET /export/* │
└─────────┼──────────────────────────────────────-┼───────────────┘
          │                                        │
┌─────────▼────────────────────────────────────-──▼───────────────┐
│  Express                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  routes/convert.js                                      │    │
│  │  - multer (memoryStorage, 10MB limit)                   │    │
│  │  - Source detection (file vs textarea)                  │    │
│  │  - Session read/write                                   │    │
│  └────────────┬────────────────────────────────────────────┘    │
└───────────────┼─────────────────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     │                     │
┌────▼─────────┐   ┌───────▼──────────┐
│ fileParser   │   │   exporter       │
│ .js          │   │   .js            │
│ ─────────────│   │ ─────────────────│
│ parseText    │   │ toCSV()          │
│ parseJsonFile│   │   csv-stringify  │
│ parseJsFile  │   │   + UTF-8 BOM    │
│   vm.Script  │   │ toExcel()        │
│ parseExcel   │   │   SheetJS AoA    │
│   SheetJS    │   │   auto-width     │
│ parseCsv     │   └──────────────────┘
│   csv-parse  │
│ normalise()  │
└──────────────┘
```

---

## Session Storage

Json2Excel uses Express's default **MemoryStore** for session data.

**Rationale:**
- No external dependencies (no Redis, no database)
- Data is transient — only needed for the current conversion session
- 30-minute TTL is appropriate for interactive single-session use

**Production upgrade path:**
Swap MemoryStore for `connect-redis` without changing any application code:
```js
// Replace default MemoryStore with:
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const redisClient = createClient({ url: process.env.REDIS_URL });
app.use(session({ store: new RedisStore({ client: redisClient }), ... }));
```

**Session data shape:**
```js
req.session.tableData = {
  data: Array<Object>,       // parsed rows
  columns: Array<string>,    // ordered column headers
  count: number,             // row count
  originalFilename: string | null,
  parsedAt: number           // Unix ms timestamp
}
```

---

## File Parser Architecture

The `fileParser.parse(source)` function is the core of the application. All parsers converge on the `normalise()` helper, which ensures a consistent output shape regardless of input.

```
parse(source)
  │
  ├─ type === 'text'         → parseText(text)
  ├─ type === 'json'         → parseJsonFile(buffer)
  ├─ type === 'js'           → parseJsFile(buffer)
  │                              ├─ Pass 1: Regex + JSON.parse
  │                              ├─ Pass 2: vm.Script sandbox
  │                              └─ Pass 3: Error
  ├─ type === 'xlsx'/'xls'   → parseExcel(buffer)
  └─ type === 'csv'          → parseCsv(buffer)
                                    │
                               normalise(input)
                                    │
                               { data, columns, error }
```

**Why vm.Script instead of eval() or require():**
- `eval()` executes in the current scope — security risk
- `require()` needs a file on disk — multer uses memoryStorage
- `vm.Script` with an isolated context is the idiomatic Node.js sandboxed evaluation approach

---

## Export Pipeline

```
CSV Export:
  data + columns
    → map to array-of-arrays (column-ordered)
    → csv-stringify/sync (RFC 4180)
    → prepend UTF-8 BOM (\uFEFF)
    → HTTP response (text/csv)

Excel Export:
  data + columns
    → array-of-arrays (header row + data rows)
    → XLSX.utils.aoa_to_sheet()
    → compute auto-widths (ws['!cols'])
    → XLSX.utils.book_new() + book_append_sheet()
    → XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    → HTTP response (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
```
