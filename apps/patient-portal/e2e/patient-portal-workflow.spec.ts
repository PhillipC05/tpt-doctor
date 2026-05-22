// ============================================================================
// TPT Doctor Patient Portal — Playwright E2E Tests
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Patient Portal Workflow', () => {
  test('should login via Auth0', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'patient@example.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await expect(page.locator('text=My Appointments')).toBeVisible();
  });

  test('should view upcoming appointments', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointments-list"]');
    await expect(page.locator('[data-testid="appointment-card"]').first()).toBeVisible();
  });

  test('should request new appointment', async ({ page }) => {
    await page.goto('/appointments');
    await page.click('[data-testid="request-appointment-btn"]');
    await page.fill('input[name="reason"]', 'Annual checkup');
    await page.fill('input[name="preferredDate"]', '2026-06-15');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Appointment requested')).toBeVisible();
  });

  test('should view medical records', async ({ page }) => {
    await page.goto('/medical-records');
    await page.waitForSelector('[data-testid="records-list"]');
    await expect(page.locator('[data-testid="record-item"]').first()).toBeVisible();
  });

  test('should view lab results', async ({ page }) => {
    await page.goto('/lab-results');
    await page.waitForSelector('[data-testid="lab-results-list"]');
    await expect(page.locator('[data-testid="lab-result-item"]').first()).toBeVisible();
  });

  test('should send secure message', async ({ page }) => {
    await page.goto('/messages');
    await page.click('[data-testid="compose-message-btn"]');
    await page.fill('input[name="subject"]', 'Question about medication');
    await page.fill('textarea[name="body"]', 'When should I take this medication?');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Message sent')).toBeVisible();
  });

  test('should update profile', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="phone"]', '555-9999');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profile updated')).toBeVisible();
  });

  test('should manage consents', async ({ page }) => {
    await page.goto('/consents');
    await page.waitForSelector('[data-testid="consents-list"]');
    const toggle = page.locator('[data-testid="consent-toggle"]').first();
    await toggle.click();
    await expect(page.locator('text=Consent updated')).toBeVisible();
  });
});