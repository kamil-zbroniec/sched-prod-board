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
page.on('console', (m) => { if (m.text().startsWith('ack ')) acks.push(m.text()); });

const t0 = Date.now();
const at = () => `${Math.floor((Date.now() - t0) / 60000)}:${String(Math.floor((Date.now() - t0) / 1000) % 60).padStart(2, '0')}`;

await page.goto(URL);
await page.waitForSelector('[data-testid="incident-row"]', { timeout: 20000 });
const firstTop = await page.locator('[data-testid="incident-row"]').first().getAttribute('data-id');
console.log('board open at', at(), 'top:', firstTop);

// watch like a person; wait for a new incident to land at the top
let top = firstTop;
let landedAt = null;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(500);
  const t = await page.locator('[data-testid="incident-row"]').first().getAttribute('data-id');
  if (t !== top) {
    top = t;
    landedAt = at();
    console.log('new incident landed at', landedAt, 'id:', top);
    break;
  }
}
if (!landedAt) throw new Error('no incident landed while watching');

// pick the row I meant — the one that was on top before the landing — and ack it now,
// while the list keeps re-rendering with fresh incidents
const rows = page.locator('[data-testid="incident-row"]');
const n = await rows.count();
const target = rows.nth(Math.min(1, n - 1));
const targetId = await target.getAttribute('data-id');
console.log('acking row', targetId, 'at', at());
await target.locator('[data-testid="ack"]').click();
await page.waitForSelector('[data-testid="acked"]', { timeout: 20000 });
console.log('ack mark visible at', at(), 'for', targetId);

// keep the board open a while; more incidents land while it stays current
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2000);
  const t = await page.locator('[data-testid="incident-row"]').first().getAttribute('data-id');
  if (t !== top) { top = t; console.log('another incident landed at', at(), 'id:', t); }
}
await page.screenshot({ path: 'board.png' });
await browser.close();

const file = fs.readdirSync(out)[0];
fs.renameSync(`${out}/${file}`, 'board-recording.webm');
fs.writeFileSync('acks.json', JSON.stringify(acks, null, 2));
fs.writeFileSync('timing.json', JSON.stringify({ boardOpenAt: '0:00', landedAt, targetId, ackedAt: acks[0] }, null, 2));
console.log('acks:', JSON.stringify(acks));
