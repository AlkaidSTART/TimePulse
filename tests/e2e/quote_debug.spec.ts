import { test, expect } from '@playwright/test';

test('inspect cheer quote card', async ({ page }) => {
  const dummyUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: { nickname: '测试用户' },
    app_metadata: { provider: 'email' },
  };
  const dummySession = {
    access_token: 'fake-jwt-token',
    refresh_token: 'fake-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 360000,
    expires_in: 360000,
    token_type: 'bearer',
    user: dummyUser,
  };

  await page.route('https://ikdbwkrqlfksmjgrzchm.supabase.co/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dummyUser),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dummySession),
      });
    }
  });

  await page.addInitScript((session) => {
    localStorage.setItem('sb-ikdbwkrqlfksmjgrzchm-auth-token', JSON.stringify(session));
    localStorage.setItem('timepulse_has_registered', 'true');
  }, dummySession);

  await page.goto('/#cheer');
  await page.waitForTimeout(2000);

  // Look for the "换一句" button
  const refreshButton = page.getByTitle('换一句');
  await expect(refreshButton).toBeVisible({ timeout: 10000 });

  // Find the card container
  const card = refreshButton.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  await page.screenshot({ path: 'test-results/cheer-full.png' });
  await card.screenshot({ path: 'test-results/cheer-card.png' });

  // Print card dimensions and inner elements
  const info = await card.evaluate((el) => {
    const textEffect = el.querySelector('p');
    const author = el.querySelector('.text-right');
    const middleDiv = el.querySelector('.flex-1.flex.flex-col');
    const textWrapper = el.querySelector('.flex-1.flex.items-center');
    return {
      card: { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, offsetHeight: el.offsetHeight, rect: el.getBoundingClientRect() },
      middleDiv: middleDiv ? { clientHeight: middleDiv.clientHeight, scrollHeight: middleDiv.scrollHeight, rect: middleDiv.getBoundingClientRect() } : null,
      textWrapper: textWrapper ? { clientHeight: textWrapper.clientHeight, scrollHeight: textWrapper.scrollHeight, rect: textWrapper.getBoundingClientRect() } : null,
      textEffect: textEffect ? {
        clientHeight: textEffect.clientHeight,
        scrollHeight: textEffect.scrollHeight,
        computedHeight: window.getComputedStyle(textEffect).height,
        lineHeight: window.getComputedStyle(textEffect).lineHeight,
        fontSize: window.getComputedStyle(textEffect).fontSize,
        fontFamily: window.getComputedStyle(textEffect).fontFamily,
        rect: textEffect.getBoundingClientRect(),
        text: textEffect.textContent,
      } : null,
      author: author ? {
        clientHeight: author.clientHeight,
        rect: author.getBoundingClientRect(),
        text: author.textContent
      } : null
    };
  });

  console.log('CARD INFO:\n' + JSON.stringify(info, null, 2));
});
