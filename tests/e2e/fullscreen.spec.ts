import { expect, test } from '@playwright/test';

test('mobile fullscreen test with F11', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForTimeout(2000);

  // Press F11
  await page.keyboard.press('F11');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test-results/mobile-after-f11.png' });

  const cheerVisible = await page.locator('[data-page-view="cheer"]').isVisible();
  const mainVisible = await page.locator('[data-page-view="main"]').isVisible();
  console.log('Mobile - cheer visible:', cheerVisible, 'main visible:', mainVisible);

  const textContent = await page.locator('body').innerText();
  console.log('Mobile body text:', JSON.stringify(textContent));
});
