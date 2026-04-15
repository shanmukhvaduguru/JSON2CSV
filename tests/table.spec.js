// tests/table.spec.js — TC-13 to TC-16: Table page behaviour
'use strict';

const { test, expect } = require('@playwright/test');
const { JSON_STRINGS } = require('./fixtures/test-data');

// Helper — navigate to /table by submitting the form with known JSON
async function goToTable(page, jsonStr) {
  await page.goto('/');
  await page.fill('#jsonText', jsonStr || JSON_STRINGS.array);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/table');
}

test.describe('Table page — rendering, sorting, navigation, session guard', () => {

  // Basic table rendering
  test('table has correct structure (thead + tbody)', async ({ page }) => {
    await goToTable(page);
    await expect(page.locator('#dataTable thead')).toBeVisible();
    await expect(page.locator('#dataTable tbody')).toBeVisible();
  });

  test('table shows row number column (#)', async ({ page }) => {
    await goToTable(page);
    // First th in thead is the '#' row-num column
    await expect(page.locator('#dataTable thead th.row-num')).toContainText('#');
  });

  test('table row numbers start at 1', async ({ page }) => {
    await goToTable(page);
    await expect(page.locator('#dataTable tbody tr:first-child td.row-num')).toHaveText('1');
  });

  test('Download CSV button is visible at top', async ({ page }) => {
    await goToTable(page);
    await expect(page.locator('.export-bar a[href="/export/csv"]')).toBeVisible();
  });

  test('Download Excel button is visible at top', async ({ page }) => {
    await goToTable(page);
    await expect(page.locator('.export-bar a[href="/export/excel"]')).toBeVisible();
  });

  test('Download buttons also visible at bottom of page', async ({ page }) => {
    await goToTable(page);
    await expect(page.locator('.export-footer a[href="/export/csv"]')).toBeVisible();
    await expect(page.locator('.export-footer a[href="/export/excel"]')).toBeVisible();
  });

  // TC-13: Sort ascending — click column header once
  test('TC-13: clicking column header once sorts rows ascending', async ({ page }) => {
    await goToTable(page, JSON_STRINGS.sortable);
    // sortable data: Carol(35), Alice(30), Bob(25) — unsorted

    const nameHeader = page.locator('th.sortable[data-col="0"]');
    await nameHeader.click();

    // Header should get sort-asc class
    await expect(nameHeader).toHaveClass(/sort-asc/);

    // First row after ascending sort should be Alice
    const firstCell = page.locator('#dataTable tbody tr:first-child td:nth-child(2)');
    await expect(firstCell).toHaveText('Alice');
  });

  // TC-14: Sort descending — click same column header twice
  test('TC-14: clicking column header twice sorts rows descending', async ({ page }) => {
    await goToTable(page, JSON_STRINGS.sortable);

    const nameHeader = page.locator('th.sortable[data-col="0"]');
    await nameHeader.click(); // asc
    await nameHeader.click(); // desc

    await expect(nameHeader).toHaveClass(/sort-desc/);

    // First row after descending sort should be Carol
    const firstCell = page.locator('#dataTable tbody tr:first-child td:nth-child(2)');
    await expect(firstCell).toHaveText('Carol');
  });

  // Switching columns resets previous sort indicator
  test('TC-14: switching to a different column clears previous sort class', async ({ page }) => {
    await goToTable(page, JSON_STRINGS.sortable);

    const col0 = page.locator('th.sortable[data-col="0"]');
    const col1 = page.locator('th.sortable[data-col="1"]');

    await col0.click(); // sort name asc
    await expect(col0).toHaveClass(/sort-asc/);

    await col1.click(); // sort age — col0 loses class
    await expect(col0).not.toHaveClass(/sort-asc/);
    await expect(col0).not.toHaveClass(/sort-desc/);
    await expect(col1).toHaveClass(/sort-asc/);
  });

  // Numeric sort — age values: 35, 30, 25. Ascending should give 25, 30, 35 (numeric, not lexicographic)
  test('TC-13: numeric sort is correct (25 < 30 < 35, not string order)', async ({ page }) => {
    await goToTable(page, JSON_STRINGS.sortable);

    const ageHeader = page.locator('th.sortable[data-col="1"]');
    await ageHeader.click();

    // td order: (1) row-num, (2) name, (3) age
    const firstAgeCell = page.locator('#dataTable tbody tr:first-child td:nth-child(3)');
    await expect(firstAgeCell).toHaveText('25');

    const lastAgeCell = page.locator('#dataTable tbody tr:last-child td:nth-child(3)');
    await expect(lastAgeCell).toHaveText('35');
  });

  // TC-15: Session guard — direct navigation to /table with no session
  test('TC-15: GET /table with no session redirects to homepage', async ({ page }) => {
    // Navigate directly to /table — this page context has never visited /convert
    // so there is no session cookie with tableData
    await page.goto('/table');
    await expect(page).toHaveURL('/');
    // Should land on the input form
    await expect(page.locator('#convertForm')).toBeVisible();
  });

  // TC-16: "← New Conversion" button goes back to /
  test('TC-16: New Conversion button navigates to homepage', async ({ page }) => {
    await goToTable(page);

    const backBtn = page.locator('a', { hasText: 'New Conversion' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('#convertForm')).toBeVisible();
  });
});
