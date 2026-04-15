// tests/fixtures/test-data.js
// Shared fixture data for all Playwright specs.
// Reuses the existing test-fixtures/ directory — no new binary files needed.
'use strict';

const path = require('path');

// Absolute paths to the real fixture files already on disk
const FIXTURES_DIR = path.join(__dirname, '..', '..', 'test-fixtures');

const FIXTURE_PATHS = {
  json: path.join(FIXTURES_DIR, 'sample.json'),  // 3 rows: Laptop, Mouse, Keyboard (columns: product, price, stock)
  js:   path.join(FIXTURES_DIR, 'sample.js'),    // 3 rows: USA, UK, Japan (module.exports, columns: country, capital, population)
  csv:  path.join(FIXTURES_DIR, 'sample.csv'),   // 3 rows: John, Jane, Sam (columns: first_name, last_name, email, score)
  xlsx: path.join(FIXTURES_DIR, 'sample.xlsx'),  // 3 rows (columns: first_name, last_name, email, score — re-exported CSV data)
};

// Inline JSON strings used for textarea tests
const JSON_STRINGS = {
  // 3-object array — Alice, Bob, Carol with name/age/city
  array: JSON.stringify([
    { name: 'Alice', age: 30, city: 'London' },
    { name: 'Bob',   age: 25, city: 'Paris'  },
    { name: 'Carol', age: 35, city: 'Berlin' },
  ]),

  // Sortable data — used in table sort tests (ages: 35, 30, 25 to verify numeric not string sort)
  sortable: JSON.stringify([
    { name: 'Carol', age: 35, city: 'Berlin' },
    { name: 'Alice', age: 30, city: 'London' },
    { name: 'Bob',   age: 25, city: 'Paris'  },
  ]),

  // Single plain object — server should wrap it as a 1-row table
  singleObject: JSON.stringify({ product: 'Widget', price: 9.99 }),

  // Intentionally invalid — will trigger server-side error
  invalid: '{ not valid json :::',
};

module.exports = { FIXTURE_PATHS, JSON_STRINGS };
