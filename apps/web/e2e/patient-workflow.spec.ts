// ============================================================================
// TPT Doctor — Playwright E2E Tests: Patient Management Workflow
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Patient Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
  });

  test('should login via Auth0', async ({ page }) => {
    await page.fill('input[name="email"]', 'doctor@tptdoctor.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should view patient list', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForSelector('[data-testid="patient-list"]');
    const patientRows = page.locator('[data-testid="patient-row"]');
    await expect(patientRows.first()).toBeVisible();
  });

  test('should search for patients', async ({ page }) => {
    await page.goto('/patients');
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForResponse((resp) => resp.url().includes('/patients?search='));
    const results = page.locator('[data-testid="patient-row"]');
    await expect(results.first()).toBeVisible();
  });

  test('should create a new patient', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="add-patient-btn"]');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Patient');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '555-0123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Patient created')).toBeVisible();
  });
});

test.describe('Appointment Scheduling', () => {
  test('should display calendar', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="calendar-view"]');
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
  });

  test('should create appointment', async ({ page }) => {
    await page.goto('/appointments');
    await page.click('[data-testid="new-appointment-btn"]');
    await page.fill('input[name="patientId"]', 'test-patient-id');
    await page.fill('input[name="title"]', 'Checkup');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Appointment created')).toBeVisible();
  });
});

test.describe('Authentication & Security', () => {
  test('should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/patients');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should display user menu after login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});