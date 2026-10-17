import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'docs/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Clean old files in docs/screenshots
for (const file of fs.readdirSync(outDir)) {
  fs.unlinkSync(path.join(outDir, file));
}

async function run() {
  const browser = await chromium.launch();

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });

  // Seed standard demo data into storage
  {
    const initPage = await desktopContext.newPage();
    await initPage.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await initPage.waitForTimeout(500);

    await initPage.evaluate(async () => {
      // 1. IndexedDB Timers
      const req = indexedDB.open('TimePulseDB', 2);
      const db = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result);
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
    });

    await initPage.close();
  }

  // 1. Cheer / Time Greeting
  console.log('Capturing 01-cheer-greeting.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#cheer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '01-cheer-greeting.png') });
    await page.close();
  }

  // 2. Countdown Timer
  console.log('Capturing 02-timer-countdown.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '02-timer-countdown.png') });
    await page.close();
  }

  // 3. Pomodoro Focus Timer
  console.log('Capturing 03-timer-short-pomodoro.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    // Switch to pomodoro timer
    await page.evaluate(async () => {
      const req = indexedDB.open('TimePulseDB', 2);
      const db = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result);
      });
      const tx = db.transaction(['state'], 'readwrite');
      tx.objectStore('state').put('countdown-pomodoro', 'activeTimerId');
      await new Promise((res) => { tx.oncomplete = res; });
      localStorage.setItem('activeTimerId', 'countdown-pomodoro');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '03-timer-short-pomodoro.png') });

    // Restore countdown-newyear as default active
    await page.evaluate(async () => {
      const req = indexedDB.open('TimePulseDB', 2);
      const db = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result);
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
    await page.goto('http://127.0.0.1:4174/#todo', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '04-todo-checklist.png') });
    await page.close();
  }

  // 5. Personal Settings Page
  console.log('Capturing 05-personal-settings.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '05-personal-settings.png') });
    await page.close();
  }

  // 6. Modal: Add Timer
  console.log('Capturing 06-modal-add-timer.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const addBtn = page.locator('[data-insightflare-event="timer_create_open"]').first();
    await addBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '06-modal-add-timer.png') });
    await page.close();
  }

  // 7. Modal: Background Settings
  console.log('Capturing 07-modal-background.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const bgBtn = page.locator('[data-insightflare-event="background_open"]').first();
    await bgBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '07-modal-background.png') });
    await page.close();
  }

  // 8. Modal: Share
  console.log('Capturing 08-modal-share.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const shareBtn = page.locator('[data-insightflare-event="share_open"]').first();
    await shareBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, '08-modal-share.png') });
    await page.close();
  }

  // 9. Fullscreen Zen Mode
  console.log('Capturing 09-fullscreen-zen.png...');
  {
    const page = await desktopContext.newPage();
    await page.goto('http://127.0.0.1:4174/#cheer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const fullscreenBtn = page.locator('[data-insightflare-event="fullscreen_toggle"]').first();
    await fullscreenBtn.click();
    // Wait for header to auto-hide
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
    const page = await mobileContext.newPage();
    await page.goto('http://127.0.0.1:4174/#main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '10-mobile-responsive.png') });
    await page.close();
    await mobileContext.close();
  }

  await desktopContext.close();
  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
