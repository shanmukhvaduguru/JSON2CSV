// tests/homepage.spec.js — TC-01: Homepage UI elements
'use strict';

const { test, expect } = require('@playwright/test');

test.describe('Homepage — page load and UI elements', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-01: page title contains Json2Excel', async ({ page }) => {
    await expect(page).toHaveTitle(/Json2Excel/i);
  });

  test('TC-01: logo is visible with correct text', async ({ page }) => {
    const logo = page.locator('.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('Json');
    await expect(logo).toContainText('Excel');
  });

  test('TC-01: tagline is visible', async ({ page }) => {
    await expect(page.locator('.tagline')).toBeVisible();
  });

  test('TC-01: JSON textarea is visible and accepts input', async ({ page }) => {
    const textarea = page.locator('#jsonText');
    await expect(textarea).toBeVisible();
    await textarea.fill('[{"test":1}]');
    await expect(textarea).toHaveValue('[{"test":1}]');
  });

  test('TC-01: file drop zone is visible', async ({ page }) => {
    await expect(page.locator('#fileDrop')).toBeVisible();
  });

  test('TC-01: file input exists in DOM (hidden inside label)', async ({ page }) => {
    await expect(page.locator('#fileInput')).toBeAttached();
  });

  test('TC-01: file drop label shows default text', async ({ page }) => {
    await expect(page.locator('#fileLabel')).toContainText('Drop file here or click to browse');
  });

  test('TC-01: supported format hints are shown', async ({ page }) => {
    // Second .hint paragraph (nth(1)) lists the supported file extensions
    const hints = page.locator('.hint').nth(1);
    await expect(hints).toContainText('.json');
    await expect(hints).toContainText('.js');
    await expect(hints).toContainText('.xlsx');
    await expect(hints).toContainText('.csv');
  });

  test('TC-01: format pills are visible', async ({ page }) => {
    await expect(page.locator('.pill').first()).toBeVisible();
  });

  test('TC-01: submit button is visible with correct label', async ({ page }) => {
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Convert');
  });

  test('TC-01: no error alert shown on clean page load', async ({ page }) => {
    await expect(page.locator('.alert-error')).not.toBeVisible();
  });

  test('TC-01: formError span is empty on clean load', async ({ page }) => {
    await expect(page.locator('#formError')).toHaveText('');
  });

  test('TC-01: footer is present', async ({ page }) => {
    await expect(page.locator('.site-footer')).toBeVisible();
    await expect(page.locator('.site-footer')).toContainText('Json2Excel');
  });
});
