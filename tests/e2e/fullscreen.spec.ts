import { expect, test } from '@playwright/test';

test('cheer page immersive fullscreen after header auto-hides', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForTimeout(2000);

  // Click fullscreen
  const fullscreenBtn = page.locator('[data-insightflare-event="fullscreen_toggle"]').first();
  await fullscreenBtn.click();

  // Wait 4 seconds for header to auto-hide
  await page.waitForTimeout(4000);

  // Capture screenshot of immersive fullscreen cheer page
  await page.screenshot({ path: 'test-results/fullscreen-cheer-immersive.png' });

  // Cheer page should be completely visible
  await expect(page.locator('[data-page-view="cheer"]')).toBeVisible();
  await expect(page.getByText('时钟主页')).toBeVisible();
});
