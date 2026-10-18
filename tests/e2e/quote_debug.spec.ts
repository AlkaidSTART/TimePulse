import { test, expect } from '@playwright/test';

test('render quotes perfectly across different viewport sizes and quote lengths', async ({ page }) => {
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

  // 1. Test Wang Zengqi quote on desktop (same as user report)
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/#cheer');
  await page.waitForTimeout(1000);

  await page.evaluate(async () => {
    const { useQuotesStore } = await import('/src/stores/useQuotesStore.ts');
    useQuotesStore.setState({
      quotes: [{
        text: '生活不在别处，脚下即是前方。心怀浪漫与热烈，把平凡的日子过得热气腾腾。',
        author: '汪曾祺',
        source: '人间草木',
        category: 'life'
      }],
      currentIndex: 0,
    });
  });

  await page.waitForTimeout(1000);

  const refreshButton = page.getByTitle('换一句');
  await expect(refreshButton).toBeVisible();

  const card = refreshButton.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  await card.screenshot({ path: 'test-results/fixed-wang-zengqi.png' });

  // 2. Test Van Gogh long quote
  await page.evaluate(async () => {
    const { useQuotesStore } = await import('/src/stores/useQuotesStore.ts');
    useQuotesStore.setState({
      quotes: [{
        text: '每个人的心里都有一团火，路过的人只看到烟。但总有一个人能看到这团火，然后走过来陪你坐一坐。',
        author: '梵高',
        source: '亲爱的提奥',
        category: 'life'
      }],
      currentIndex: 0,
    });
  });
  await page.waitForTimeout(1000);
  await card.screenshot({ path: 'test-results/fixed-van-gogh.png' });

  // 3. Test on Mobile viewport (390px iPhone)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await card.screenshot({ path: 'test-results/fixed-mobile-quote.png' });
});
