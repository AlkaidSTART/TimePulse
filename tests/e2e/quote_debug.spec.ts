import { test, expect } from '@playwright/test';

test('inspect cheer quote card', async ({ page }) => {
  await page.goto('/#cheer');
  await page.waitForTimeout(1500);

  // Look for the "换一句" button
  const refreshButton = page.getByTitle('换一句');
  await expect(refreshButton).toBeVisible();

  // Find the card container
  const card = refreshButton.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  await card.screenshot({ path: 'test-results/cheer-card.png' });

  // Print card dimensions and inner elements
  const info = await card.evaluate((el) => {
    const textEffect = el.querySelector('p');
    const author = el.querySelector('.text-right');
    return {
      card: { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, offsetHeight: el.offsetHeight },
      textEffect: textEffect ? {
        clientHeight: textEffect.clientHeight,
        scrollHeight: textEffect.scrollHeight,
        computedHeight: window.getComputedStyle(textEffect).height,
        lineHeight: window.getComputedStyle(textEffect).lineHeight,
        fontSize: window.getComputedStyle(textEffect).fontSize,
        fontFamily: window.getComputedStyle(textEffect).fontFamily,
        text: textEffect.textContent,
        spans: Array.from(textEffect.querySelectorAll('span')).map(s => ({
          text: s.textContent,
          clientHeight: s.clientHeight,
          rect: s.getBoundingClientRect()
        }))
      } : null,
      author: author ? {
        clientHeight: author.clientHeight,
        rect: author.getBoundingClientRect()
      } : null
    };
  });

  console.log('CARD INFO:', JSON.stringify(info, null, 2));
});
