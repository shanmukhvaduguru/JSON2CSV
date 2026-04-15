// tests/convert-files.spec.js — TC-05 to TC-08: File upload for each format
'use strict';

const { test, expect } = require('@playwright/test');
const { FIXTURE_PATHS } = require('./fixtures/test-data');

test.describe('Convert — file uploads', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // TC-05: Upload .json file
  test('TC-05: .json file upload renders table', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.json);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });

  test('TC-05: .json file upload shows 3 data rows', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.json);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    // sample.json has 3 rows: Laptop, Mouse, Keyboard
    await expect(page.locator('#dataTable tbody tr')).toHaveCount(3);
  });

  test('TC-05: .json file upload shows correct first column (product)', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.json);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('th.sortable').nth(0)).toContainText('product');
  });

  test('TC-05: .json file upload shows filename badge', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.json);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.filename-badge')).toBeVisible();
    await expect(page.locator('.filename-badge')).toContainText('sample.json');
  });

  // TC-06: Upload .js file (module.exports = [...])
  test('TC-06: .js file upload renders table', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.js);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });

  test('TC-06: .js file upload shows 3 data rows', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.js);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    // sample.js has 3 rows: USA, UK, Japan
    await expect(page.locator('#dataTable tbody tr')).toHaveCount(3);
  });

  test('TC-06: .js file upload shows correct first column (country)', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.js);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('th.sortable').nth(0)).toContainText('country');
  });

  test('TC-06: .js file upload shows filename badge', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.js);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.filename-badge')).toContainText('sample.js');
  });

  // TC-07: Upload .csv file
  test('TC-07: .csv file upload renders table', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.csv);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });

  test('TC-07: .csv file upload shows 3 data rows', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.csv);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    // sample.csv: 3 data rows + 1 header row (header not counted)
    await expect(page.locator('#dataTable tbody tr')).toHaveCount(3);
  });

  test('TC-07: .csv file upload shows correct columns (first_name, last_name, email, score)', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.csv);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('th.sortable').nth(0)).toContainText('first_name');
    await expect(page.locator('th.sortable').nth(3)).toContainText('score');
  });

  test('TC-07: .csv file upload shows 4 columns', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.csv);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.meta-badge').nth(1)).toContainText('4 column');
  });

  // TC-08: Upload .xlsx file
  test('TC-08: .xlsx file upload renders table', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.xlsx);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });

  test('TC-08: .xlsx file upload has at least 1 data row', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.xlsx);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    const rows = page.locator('#dataTable tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('TC-08: .xlsx file upload shows filename badge with .xlsx extension', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.xlsx);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page.locator('.filename-badge')).toBeVisible();
    await expect(page.locator('.filename-badge')).toContainText('sample.xlsx');
  });

  // File label updates when file is selected
  test('file label updates to show selected filename', async ({ page }) => {
    await page.setInputFiles('#fileInput', FIXTURE_PATHS.json);
    await expect(page.locator('#fileLabel')).toContainText('sample.json');
  });
});
