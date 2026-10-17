import { expect, test } from '@playwright/test';

test('inspect fullscreen behavior', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForTimeout(1000);

  // Check cheer page is visible initially
  const cheerVisible = await page.locator('[data-page-view="cheer"]').isVisible();
  console.log('Initial cheer page visible:', cheerVisible);

  // Take screenshot before fullscreen
  await page.screenshot({ path: 'test-results/before-fullscreen.png' });

  // Click fullscreen button
  const fullscreenBtn = page.locator('[data-insightflare-event="fullscreen_toggle"]').first();
  console.log('Fullscreen button exists:', await fullscreenBtn.count());
  await fullscreenBtn.click();
  await page.waitForTimeout(1000);

  // Check visibility of pages
  const cheerAfter = await page.locator('[data-page-view="cheer"]').isVisible();
  const mainAfter = await page.locator('[data-page-view="main"]').isVisible();
  console.log('After fullscreen - cheer visible:', cheerAfter);
  console.log('After fullscreen - main visible:', mainAfter);

  // Take screenshot after fullscreen
  await page.screenshot({ path: 'test-results/after-fullscreen.png' });

  // Check what text is visible on the page
  const textContent = await page.locator('body').innerText();
  console.log('Body text content after fullscreen:', JSON.stringify(textContent));
});
