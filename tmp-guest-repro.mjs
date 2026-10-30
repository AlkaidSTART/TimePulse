import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto('http://127.0.0.1:5199/#register', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('hash before:', await page.evaluate(() => location.hash));
console.log('guest btn exists:', await page.getByRole('button', { name: /游客登录/ }).count());

const btn = page.getByRole('button', { name: /游客登录/ });
console.log('disabled:', await btn.isDisabled());
await btn.click();
await page.waitForTimeout(1200);

console.log('hash after:', await page.evaluate(() => location.hash));
console.log('guest flag:', await page.evaluate(() => localStorage.getItem('timepulse_guest_mode')));
console.log('has auth page:', await page.locator('[data-page-view="auth"]').count());
console.log('has main page:', await page.locator('[data-page-view="main"]').count());

await page.screenshot({ path: '/private/tmp/commandcode-501/-Users-allure-Desktop-TimePulse/69b0c510-fda8-4585-bd9c-3a6dac5d1149/scratchpad/after-guest.png', fullPage: false });
await browser.close();
