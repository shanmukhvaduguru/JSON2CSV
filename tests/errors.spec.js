// tests/errors.spec.js — TC-09, TC-10 + edge case error scenarios
'use strict';

const { test, expect } = require('@playwright/test');
const { JSON_STRINGS } = require('./fixtures/test-data');

test.describe('Error scenarios — client-side and server-side', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // TC-02 (duplicate from convert-text but kept here for completeness)
  test('TC-02: empty submit shows client-side formError (no server call)', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('#formError')).toBeVisible();
    await expect(page.locator('#formError')).toContainText(
      'Please paste JSON text or select a file before converting.'
    );
    // Still on homepage — client-side validation prevented submission
    await expect(page).toHaveURL('/');
    // No server-side .alert-error (no ?error= in URL)
    await expect(page.locator('.alert-error')).not.toBeVisible();
  });

  // TC-09: Invalid JSON → server-side error banner
  test('TC-09: invalid JSON shows server-side alert-error', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.invalid);
    await page.click('button[type="submit"]');
    // Server redirects to /?error=Invalid+JSON:...
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Invalid JSON');
  });

  test('TC-09: invalid JSON error stays on homepage', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.invalid);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\//);
    // Must NOT redirect to /table
    await expect(page.locator('#dataTable')).not.toBeVisible();
  });

  // TC-10: Unsupported file type (.txt) → multer fileFilter rejects it
  test('TC-10: .txt file upload shows unsupported type error', async ({ page }) => {
    // Use in-memory virtual file — no .txt fixture needed on disk
    await page.setInputFiles('#fileInput', {
      name: 'data.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is plain text'),
    });
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('Unsupported file type');
    await expect(page.locator('.alert-error')).toContainText('.json');
  });

  // Edge case: empty JSON array [] → "No valid objects found" (empty array has 0 valid object items)
  test('empty array [] shows "No valid objects found" error', async ({ page }) => {
    await page.fill('#jsonText', '[]');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('No valid objects found');
  });

  // Edge case: array of primitives → "No valid objects found"
  test('array of primitives [1,2,3] shows "No valid objects" error', async ({ page }) => {
    await page.fill('#jsonText', '[1, 2, 3]');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page.locator('.alert-error')).toContainText('No valid objects found');
  });

  // Edge case: null JSON value → not a valid object/array
  test('null JSON value shows error', async ({ page }) => {
    await page.fill('#jsonText', 'null');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible();
  });

  // formError clears when user starts typing after a validation error
  test('formError clears when user types in textarea', async ({ page }) => {
    // Trigger the client-side error
    await page.click('button[type="submit"]');
    await expect(page.locator('#formError')).toContainText('Please paste JSON');

    // Start typing — the input event handler should clear #formError
    await page.fill('#jsonText', '[');
    await expect(page.locator('#formError')).toHaveText('');
  });

  // Error alert has the correct visual structure (icon + message)
  test('server-side error alert has icon and message text', async ({ page }) => {
    await page.fill('#jsonText', JSON_STRINGS.invalid);
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error .alert-icon')).toBeVisible();
    await expect(page.locator('.alert-error span:last-child')).toBeVisible();
  });

  // After fixing the error, a valid submission should succeed
  test('valid JSON after error navigates to /table', async ({ page }) => {
    // First cause an error
    await page.fill('#jsonText', JSON_STRINGS.invalid);
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-error')).toBeVisible();

    // Now navigate back and submit valid JSON
    await page.goto('/');
    await page.fill('#jsonText', '[{"fixed":true}]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/table');
    await expect(page).toHaveURL('/table');
    await expect(page.locator('#dataTable')).toBeVisible();
  });
});
