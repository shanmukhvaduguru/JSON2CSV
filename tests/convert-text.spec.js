// tests/convert-text.spec.js — TC-02 to TC-04: Textarea JSON conversion
'use strict';

const { test, expect } = require('@playwright/test');
const { JSON_STRINGS } = require('./fixtures/test-data');

test.describe('Convert — textarea JSON input', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // TC-02: Empty submit — client-side validation fires, no server round-trip
  test('TC-02: empty submit shows #formError message', async ({ page }) => {
    await page.click('button[type="submit"]');
    const err = page.locator('#formError');
    await expect(err).toBeVisible();
    await expect(err).toContainText('Please paste JSON text or select a file before converting.');
  });

  test('TC-02: empty submit stays on homepage (no navigation)', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  // TC-03: JSON array paste → /table with correct rows and columns
  test('TC-03: JSON array paste redirects to /table', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page).toHaveURL('/table');
  });

  test('TC-03: table is visible after JSON array paste', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });

  test('TC-03: table shows 3 data rows for 3-element array', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable tbody tr')).toHaveCount(3);
  });

  test('TC-03: column headers match JSON keys (name, age, city)', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('th.sortable').nth(0)).toContainText('name');
    await expect(page.locator('th.sortable').nth(1)).toContainText('age');
    await expect(page.locator('th.sortable').nth(2)).toContainText('city');
  });

  test('TC-03: meta badges show 3 rows and 3 columns', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    const badges = page.locator('.meta-badge');
    await expect(badges.nth(0)).toContainText('3 row');
    await expect(badges.nth(1)).toContainText('3 column');
  });

  test('TC-03: table contains the expected cell data', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    // First data row, second td (skipping row-num td) should be "Alice"
    const firstNameCell = page.locator('#dataTable tbody tr:first-child td:nth-child(2)');
    await expect(firstNameCell).toHaveText('Alice');
  });

  // TC-04: Single plain object → server wraps it as 1-row table
  test('TC-04: single object paste redirects to /table', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.singleObject);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page).toHaveURL('/table');
  });

  test('TC-04: single object produces exactly 1 data row', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.singleObject);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable tbody tr')).toHaveCount(1);
  });

  test('TC-04: single object shows correct columns (product, price)', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.singleObject);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('th.sortable').nth(0)).toContainText('product');
    await expect(page.locator('th.sortable').nth(1)).toContainText('price');
  });

  test('TC-04: single object meta badge shows 1 row', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.singleObject);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.meta-badge').first()).toContainText('1 row');
  });

  // No filename badge for textarea input
  test('TC-03: no filename badge shown for textarea conversion', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.filename-badge')).not.toBeVisible();
  });
});
