// tests/export.spec.js — TC-11 & TC-12: CSV and Excel download verification
'use strict';

const { test, expect } = require('@playwright/test');
const { JSON_STRINGS } = require('./fixtures/test-data');

// Helper — load table page with session, return cookies for API requests
async function goToTableAndGetCookies(page) {
  await page.goto('/');
  await page.fill('#jsonText', JSON_STRINGS.array);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/table');

  // page.context().cookies() returns session cookies for the current domain
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  return cookieHeader;
}

test.describe('Export — CSV and Excel downloads', () => {

  // ---------- TC-11: CSV download ----------

  test('TC-11: CSV download returns HTTP 200', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    expect(resp.status()).toBe(200);
  });

  test('TC-11: CSV Content-Type is text/csv', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    expect(resp.headers()['content-type']).toMatch(/text\/csv/i);
  });

  test('TC-11: CSV Content-Disposition is attachment with filename export.csv', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    const disp = resp.headers()['content-disposition'] || '';
    expect(disp).toMatch(/attachment/i);
    expect(disp).toMatch(/export\.csv/i);
  });

  test('TC-11: CSV body contains column headers', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    const text = await resp.text();
    // JSON_STRINGS.array has columns: name, age, city
    expect(text).toContain('name');
    expect(text).toContain('age');
    expect(text).toContain('city');
  });

  test('TC-11: CSV body contains data rows', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    const text = await resp.text();
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    expect(text).toContain('Carol');
  });

  test('TC-11: CSV starts with UTF-8 BOM for Excel compatibility', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/csv', { headers: { Cookie: cookieHeader } });
    const body = await resp.body();
    // UTF-8 BOM = 0xEF 0xBB 0xBF
    expect(body[0]).toBe(0xEF);
    expect(body[1]).toBe(0xBB);
    expect(body[2]).toBe(0xBF);
  });

  // Download event — verifies the browser download dialog is triggered
  test('TC-11: CSV download link triggers browser download with correct filename', async ({ page }) => {
    await page.goto('/');
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('a[href="/export/csv"]').first().click(),
    ]);

    expect(download.suggestedFilename()).toBe('export.csv');
  });

  // ---------- TC-12: Excel download ----------

  test('TC-12: Excel download returns HTTP 200', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/excel', { headers: { Cookie: cookieHeader } });
    expect(resp.status()).toBe(200);
  });

  test('TC-12: Excel Content-Type is OOXML spreadsheet', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/excel', { headers: { Cookie: cookieHeader } });
    expect(resp.headers()['content-type']).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i
    );
  });

  test('TC-12: Excel Content-Disposition is attachment with filename export.xlsx', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/excel', { headers: { Cookie: cookieHeader } });
    const disp = resp.headers()['content-disposition'] || '';
    expect(disp).toMatch(/attachment/i);
    expect(disp).toMatch(/export\.xlsx/i);
  });

  test('TC-12: Excel buffer is non-empty (>1000 bytes)', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/excel', { headers: { Cookie: cookieHeader } });
    const body = await resp.body();
    expect(body.length).toBeGreaterThan(1000);
  });

  test('TC-12: Excel buffer starts with PK magic bytes (valid ZIP/XLSX)', async ({ page, request }) => {
    const cookieHeader = await goToTableAndGetCookies(page);
    const resp = await request.get('/export/excel', { headers: { Cookie: cookieHeader } });
    const body = await resp.body();
    // .xlsx files are ZIP archives — magic bytes: PK (0x50 0x4B)
    expect(body[0]).toBe(0x50); // 'P'
    expect(body[1]).toBe(0x4B); // 'K'
  });

  // Download event
  test('TC-12: Excel download link triggers browser download with correct filename', async ({ page }) => {
    await page.goto('/');
    await page.fill('#jsonText', JSON_STRINGS.array);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('a[href="/export/excel"]').first().click(),
    ]);

    expect(download.suggestedFilename()).toBe('export.xlsx');
  });

  // Session guard on export endpoints
  test('TC-12: /export/csv with no session redirects to homepage', async ({ page }) => {
    // Navigate in the browser without a prior /convert — no session
    await page.goto('/export/csv');
    await expect(page).toHaveURL('/');
  });

  test('TC-12: /export/excel with no session redirects to homepage', async ({ page }) => {
    await page.goto('/export/excel');
    await expect(page).toHaveURL('/');
  });
});
