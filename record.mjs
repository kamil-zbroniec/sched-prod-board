import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.argv[2] ?? 'https://kamil-zbroniec.github.io/sched-prod-board/app/';
const out = 'recording';
fs.rmSync(out, { recursive: true, force: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: out, size: { width: 1280, height: 800 } },
  locale: 'en-GB',
  timezoneId: 'Europe/Warsaw',
});
const page = await ctx.newPage();
const acks = [];
page.on('console', (m) => {
  if (m.text().startsWith('ack ')) acks.push(m.text());
});

const t0 = Date.now();
await page.goto(URL);
// loader -> list
await page.waitForSelector('[data-testid="incident-row"]', { timeout: 20000 });
await page.waitForTimeout(1500); // list on screen
// ack the second row (keep one for the visual)
const rows = page.locator('[data-testid="incident-row"]');
const n = await rows.count();
const target = rows.nth(Math.min(1, n - 1));
await target.locator('[data-testid="ack"]').click();
await page.waitForSelector('[data-testid="acked"]', { timeout: 20000 });
console.log('ackVisibleAt:', Date.now() - t0, 'ms after navigation start');
await page.waitForTimeout(7000); // board stays open; 2s refresh runs
await page.screenshot({ path: 'board.png', fullPage: false });
await browser.close();

const file = fs.readdirSync(out)[0];
fs.renameSync(`${out}/${file}`, 'board-recording.webm');
fs.writeFileSync('acks.json', JSON.stringify(acks, null, 2));
console.log('acks:', JSON.stringify(acks));
console.log('sha in footer:', await (async () => 'see screenshot')());
