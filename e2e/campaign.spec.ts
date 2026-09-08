import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    // WebKit routes MapLibre blob workers too; allow only this local origin.
    if (url.origin !== 'http://127.0.0.1:43187') return route.abort();
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
      : { json: { message: 'Humanitarian agreement accepted.', updates: [
        { type: 'event', description: 'Aid agreement recorded.', eventType: 'diplomacy', year: 1940 },
        { type: 'relation', nationA: 'United Kingdom', nationB: 'France', relationType: 'friendly' },
        { type: 'owner', provinceName: 'France', newOwnerId: 'player' },
      ], storySoFar: 'Aid agreement established.' } });
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
  await input.fill('Prepare a follow-up shipment.');
  await input.press('Enter');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText('Game saved.', { exact: true })).toBeVisible();
  const savedState = await page.evaluate(() => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState);
  expect(savedState.relations).toHaveLength(1);
  expect(savedState.timeline).toHaveLength(1);
  expect(savedState.timeline[0].gameStateSlim.provinceOwners).toEqual(
    Object.fromEntries(savedState.provinceOwners.map((p: { id: string; ownerId: string | null }) => [String(p.id), p.ownerId])),
  );
  const savedUrl = page.url();
  await page.reload();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  await expect(page.getByText('Humanitarian agreement accepted.')).toBeVisible();
  await expect(page.getByText('1940', { exact: true }).first()).toBeVisible();
  expect(page.url()).toBe(savedUrl);
  await expect(page.getByRole('button', { name: /Relations.*1/i })).toBeVisible();
  await expect(page.getByText('No timeline snapshots yet.', { exact: false })).toHaveCount(0);
  await expect(page.getByText('1 order queued')).toBeVisible();
  // Saving again proves that restored UI state, not just the old JSON, survives.
  await page.getByRole('button', { name: /^save$/i }).click();
  const restoredState = await page.evaluate(() => JSON.parse(localStorage.getItem('open_historia_saves') || '[]')[0].gameState);
  expect(restoredState.relations).toEqual(savedState.relations);
  expect(restoredState.timeline).toEqual(savedState.timeline);
  expect(restoredState.pendingOrders).toEqual(['Prepare a follow-up shipment.']);
});


test('save failure keeps the active campaign open', async ({ page }) => {
  await startCampaign(page);
  const url = page.url();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'open_historia_saves') throw new DOMException('Synthetic quota limit', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: /^save & exit$/i }).click();
  await expect(page.getByText(/Save failed: Storage quota exceeded/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Enter orders/ })).toBeVisible();
  expect(page.url()).toBe(url);
});
