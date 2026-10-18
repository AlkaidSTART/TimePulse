import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';

const outDir = path.resolve(process.cwd(), 'docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mockUser = {
  id: 'e8a93cb2-9382-414f-b648-932f94ca2e32',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'traveler@timepulse.app',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    nickname: '星河漫游者',
    custom_motto: '心怀热爱，奔赴每一个灿烂的日子',
    avatar_url: '',
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-10-18T00:00:00.000Z',
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: mockUser,
};

async function setupContextMocking(context, isAuthenticated = true) {
  await context.route('https://*.supabase.co/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user') || url.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSession),
      });
      return;
    }
    if (url.includes('/storage/v1/object/list/touxiang')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }
    if (url.includes('/rest/v1/app_versions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ version: '0.7.0', release_notes: '最新稳定版本' }]),
      });
      return;
    }
    if (url.includes('/rest/v1/inspirational_quotes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            text: '心怀热爱，奔赴每一个灿烂的日子。',
            author: 'TimePulse',
            source: '每日时光寄语',
            category: 'life',
          },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await context.route('https://insight.ravelloh.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'console.log("Mock analytics loaded");',
    });
  });

  if (isAuthenticated) {
    await context.addInitScript((session) => {
      localStorage.setItem('sb-ikdbwkrqlfksmjgrzchm-auth-token', JSON.stringify(session));
      localStorage.setItem('timepulse_has_registered', 'true');
      localStorage.setItem('timepulse_registered_email', 'traveler@timepulse.app');
    }, mockSession);
  }
}

async function run() {
  console.log('Starting preview server for docs screenshot capture on port 4174...');
  let previewServer;
  try {
    previewServer = await preview({ preview: { port: 4174 } });
  } catch (err) {
    console.log('Preview server setup note:', err.message);
  }

  const browser = await chromium.launch();

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  await setupContextMocking(desktopContext, true);

  // Seed standard demo data into storage
  {
    const initPage = await desktopContext.newPage();
    await initPage.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await initPage.waitForTimeout(600);

    await initPage.evaluate(async () => {
      // 1. IndexedDB Timers (DATABASE_VERSION = 3)
      const req = indexedDB.open('TimePulseDB', 3);
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('custom_backgrounds')) d.createObjectStore('custom_backgrounds', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('timers')) d.createObjectStore('timers', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
          if (!d.objectStoreNames.contains('todos')) d.createObjectStore('todos', { keyPath: 'id' });
        };
      });
      const tx = db.transaction(['timers', 'state'], 'readwrite');
      const timerCountdown = {
        id: 'countdown-newyear',
        name: '2027 跨年倒计时',
        type: 'countdown',
        targetDate: '2027-01-01T00:00:00.000Z',
        timezone: 'Asia/Shanghai',
        color: '#0284c7',
        createdAt: new Date().toISOString(),
      };
      const timerPomodoro = {
        id: 'countdown-pomodoro',
        name: '番茄钟 · 深度专注',
        type: 'countdown',
        countdownType: 'short',
        durationSeconds: 1500,
        targetDate: new Date(Date.now() + 24 * 60 * 1000 + 45 * 1000).toISOString(),
        timezone: 'Asia/Shanghai',
        color: '#10b981',
        createdAt: new Date().toISOString(),
      };
      tx.objectStore('timers').put(timerCountdown);
      tx.objectStore('timers').put(timerPomodoro);
      tx.objectStore('state').put('countdown-newyear', 'activeTimerId');
      await new Promise((res) => { tx.oncomplete = res; });
      localStorage.setItem('timers', JSON.stringify([timerCountdown, timerPomodoro]));
      localStorage.setItem('activeTimerId', 'countdown-newyear');

      // 2. Todos
      const sampleTodos = [
        {
          id: 't-1',
          text: '完成 TimePulse 现代化架构与多端适配设计',
          completed: false,
          priority: 'high',
          color: '#ef4444',
          type: 'todo',
          createdAt: Date.now(),
        },
        {
          id: 't-2',
          text: '开启 25 分钟番茄钟进行深度工作',
          completed: false,
          priority: 'medium',
          color: '#f59e0b',
          type: 'todo',
          createdAt: Date.now() - 3600000,
        },
        {
          id: 't-3',
          text: '探索全屏沉浸与禅模式个性化设置',
          completed: true,
          priority: 'low',
          color: '#10b981',
          type: 'todo',
          createdAt: Date.now() - 7200000,
        },
      ];
      localStorage.setItem('timepulse_todo_items_v1', JSON.stringify(sampleTodos));

      // 3. Personal Settings
      const settings = {
        nickname: '星河漫游者',
        customMotto: '心怀热爱，奔赴每一个灿烂的日子',
        cheerCount: 42,
      };
      localStorage.setItem('timepulse_personal_settings_v1', JSON.stringify(settings));

      // 4. Cached Quotes
      const sampleQuotes = [
        {
          text: '心怀热爱，奔赴每一个灿烂的日子。',
          author: 'TimePulse',
          source: '每日时光寄语',
          category: 'life',
        },
      ];
      localStorage.setItem('timepulse_cached_quotes_v1', JSON.stringify(sampleQuotes));
      localStorage.setItem('timepulse_cached_quotes_ts_v1', String(Date.now()));
    });

    await initPage.close();
  }

  // 1. Cheer / Time Greeting
  console.log('Capturing 01-cheer-greeting.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#cheer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '01-cheer-greeting.png') });
    await page.close();
  }

  // 2. Countdown Timer
  console.log('Capturing 02-timer-countdown.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '02-timer-countdown.png') });
    await page.close();
  }

  // 3. Pomodoro Focus Timer
  console.log('Capturing 03-timer-short-pomodoro.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      const req = indexedDB.open('TimePulseDB', 3);
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['state'], 'readwrite');
      tx.objectStore('state').put('countdown-pomodoro', 'activeTimerId');
      await new Promise((res) => { tx.oncomplete = res; });
      localStorage.setItem('activeTimerId', 'countdown-pomodoro');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '03-timer-short-pomodoro.png') });

    // Restore countdown-newyear as default active
    await page.evaluate(async () => {
      const req = indexedDB.open('TimePulseDB', 3);
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['state'], 'readwrite');
      tx.objectStore('state').put('countdown-newyear', 'activeTimerId');
      await new Promise((res) => { tx.oncomplete = res; });
      localStorage.setItem('activeTimerId', 'countdown-newyear');
    });
    await page.close();
  }

  // 4. Todo Page
  console.log('Capturing 04-todo-checklist.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#todo', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '04-todo-checklist.png') });
    await page.close();
  }

  // 5. Personal Settings Page
  console.log('Capturing 05-personal-settings.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '05-personal-settings.png') });
    await page.close();
  }

  // 6. Modal: Add Timer
  console.log('Capturing 06-modal-add-timer.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const addBtn = page.locator('[data-insightflare-event="timer_create_open"]').first();
    await addBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '06-modal-add-timer.png') });
    await page.close();
  }

  // 7. Modal: Background Settings
  console.log('Capturing 07-modal-background.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const bgBtn = page.locator('[data-insightflare-event="background_open"]').first();
    await bgBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '07-modal-background.png') });
    await page.close();
  }

  // 8. Modal: Share
  console.log('Capturing 08-modal-share.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const shareBtn = page.locator('[data-insightflare-event="share_open"]').first();
    await shareBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '08-modal-share.png') });
    await page.close();
  }

  // 9. Fullscreen Zen Mode
  console.log('Capturing 09-fullscreen-zen.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#cheer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const fullscreenBtn = page.locator('[data-insightflare-event="fullscreen_toggle"]').first();
    await fullscreenBtn.click();
    await page.waitForTimeout(4500);
    await page.screenshot({ path: path.join(outDir, '09-fullscreen-zen.png') });
    await page.close();
  }

  // 10. Mobile Responsive View
  console.log('Capturing 10-mobile-responsive.png...');
  {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    });
    await setupContextMocking(mobileContext, true);
    const page = await mobileContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '10-mobile-responsive.png') });
    await page.close();
    await mobileContext.close();
  }

  // 11. Auth Page - Sign Up / Sign In (Unauthenticated view)
  console.log('Capturing 11-auth-register.png...');
  {
    const unauthContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    });
    await setupContextMocking(unauthContext, false);
    const page = await unauthContext.newPage();
    await page.goto('http://127.0.0.1:4174/#register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '11-auth-register.png') });
    await page.close();
    await unauthContext.close();
  }

  // 12. Auth Page - Profile & Cloud Sync (Authenticated management view)
  console.log('Capturing 12-auth-cloud-sync.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.location.hash = '#auth';
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '12-auth-cloud-sync.png') });
    await page.close();
  }

  await desktopContext.close();
  await browser.close();

  if (previewServer?.httpServer) {
    previewServer.httpServer.close();
  }
  console.log('All 12 screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
