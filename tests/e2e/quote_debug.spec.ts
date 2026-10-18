import { test, expect } from '@playwright/test';

test('render 3-line quote on mobile after animation completes', async ({ page }) => {
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

  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE / small screen
  await page.goto('/#cheer');
  await page.waitForTimeout(500);

  await page.evaluate(async () => {
    const { useQuotesStore } = await import('/src/stores/useQuotesStore.ts');
    useQuotesStore.setState({
      quotes: [{
        text: '生活是一场漫长的旅行，重要的不是目的地，而是沿途看风景的心情与同行的勇气。无论前方是繁花还是荆棘，都请保持对生活的热爱与期待。',
        author: '卡尔维诺',
        source: '看不见的城市',
        category: 'literature'
      }],
      currentIndex: 0,
    });
  });

  // Wait 2.5s for text-effect reveal animation to complete fully
  await page.waitForTimeout(2500);

  const refreshButton = page.getByTitle('换一句');
  await expect(refreshButton).toBeVisible();

  const card = refreshButton.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  await card.screenshot({ path: 'test-results/fixed-calvino-se.png' });
});
