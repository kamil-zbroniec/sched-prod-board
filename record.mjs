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
const rows = page.locator('[data-testid="incident-row"]');
const aimRow = rows.nth(1);
const aimId = await aimRow.getAttribute('data-id');
console.log('board open at', at(), '| aiming at row', aimId);

// a person opens the incident panel of the row they mean
await aimRow.click();
await page.waitForSelector('[data-testid="incident-panel"]:not([hidden])', { timeout: 10000 });
console.log('panel open at', at(), '| panel names:', await page.locator('[data-testid="incident-panel"]').getAttribute('data-id'));
console.log('panel-ack present:', await page.locator('[data-testid="panel-ack"]').count());

// wait for a new incident to land at the top — the list shifts under the open panel
let top = await rows.first().getAttribute('data-id');
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(500);
  const t = await rows.first().getAttribute('data-id');
  if (t !== top) { console.log('incident landed at', at(), '| new top:', t); break; }
}

// ack from the panel, while the list keeps shifting — keyed to the incident id
await page.locator('[data-testid="panel-ack"]').click();
await page.waitForSelector('[data-testid="panel-ack"]', { state: 'detached', timeout: 20000 });
console.log('panel ack done at', at());
await page.waitForTimeout(2000);

// the acked mark shows in the row I meant, keyed by id
const ackedRowId = await page.locator('[data-testid="incident-row"]:has([data-testid="acked"])').first().getAttribute('data-id');
console.log('aimed at:', aimId, '| got:', ackedRowId);

// keep watching; more incidents land while the board stays current
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(2000);
  const t = await rows.first().getAttribute('data-id');
  if (t !== top) { top = t; console.log('another incident landed at', at(), 'id:', t); }
}
await browser.close();

const file = fs.readdirSync(out)[0];
fs.renameSync(`${out}/${file}`, 'board-recording.webm');
fs.writeFileSync('acks.json', JSON.stringify(acks, null, 2));
console.log('acks:', JSON.stringify(acks));
