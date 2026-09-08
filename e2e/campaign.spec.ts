import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') return route.abort();
    if (route.request().url().includes('/api/auth/get-session')) {
      return route.fulfill({ json: null });
    }
    return route.continue();
  });
});

async function startCampaign(page: import('@playwright/test').Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: /^war World War II/ }).click();
  await page.getByRole('button', { name: 'United Kingdom', exact: true }).click();
  await page.getByRole('button', { name: 'Initialize Simulation' }).click();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
}

test('failed turn retains orders and year; retry commits once and save reloads', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/turn', async route => {
    requests++;
    await route.fulfill(requests === 1
      ? { status: 503, json: { message: 'Synthetic provider unavailable' } }
      : { json: { message: 'Humanitarian agreement accepted.', updates: [], storySoFar: 'Aid agreement established.' } });
  });
  await startCampaign(page);
  await expect(page).toHaveURL(/\/play\/[^/]+$/);
  const input = page.getByRole('textbox', { name: /Enter orders/ });
  await input.fill('Negotiate humanitarian shipping access.');
  await input.press('Enter');
  await page.getByRole('combobox').selectOption('1y');
  await page.getByRole('button', { name: /^advance$/i }).first().click();
  await expect(page.getByText('Synthetic provider unavailable')).toBeVisible();
  await expect(page.getByText('No orders queued')).toHaveCount(0);
  await expect(page.getByText('1940', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^advance$/i }).first().click();
  await expect(page.getByText('Humanitarian agreement accepted.')).toBeVisible();
  await expect(page.getByText('No orders queued')).toBeVisible();
  await expect(page.getByText('1940', { exact: true }).first()).toBeVisible();
  expect(requests).toBe(2);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  const savedUrl = page.url();
  await page.reload();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  await expect(page.getByText('Humanitarian agreement accepted.')).toBeVisible();
  await expect(page.getByText('1940', { exact: true }).first()).toBeVisible();
  expect(page.url()).toBe(savedUrl);
});
