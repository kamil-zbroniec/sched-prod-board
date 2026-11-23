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
const aimRow = rows.nth(1); // second row is the one I mean
const aimId = await aimRow.getAttribute('data-id');
console.log('board open at', at(), '| aiming at row', aimId);

// hover like a person looking at the button
const aimBtn = aimRow.locator('[data-testid="ack"]');
await aimBtn.hover();
const box = await aimBtn.boundingBox();
console.log('aimed at', at(), '| button coords', JSON.stringify(box));

// wait for a new incident to land at the top (list shifts down)
let top = await rows.first().getAttribute('data-id');
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(500);
  const t = await rows.first().getAttribute('data-id');
  if (t !== top) { console.log('incident landed at', at(), '| new top:', t); break; }
}

// the person clicks where they were looking — the original spot, which after the shift holds another row
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
console.log('clicking at', at(), '| original aim was', aimId);
await page.mouse.move(cx, cy);
await page.mouse.click(cx, cy);
await page.waitForSelector('[data-testid="acked"]', { timeout: 20000 });

const ackedRowId = await page.locator('[data-testid="incident-row"]:has([data-testid="acked"])').first().getAttribute('data-id');
console.log('acked row on screen:', ackedRowId, 'at', at());
console.log('aimed at:', aimId, '| got:', ackedRowId);

// keep watching; board stays current
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2000);
  const t = await rows.first().getAttribute('data-id');
  console.log('watching at', at(), '| top:', t);
}
await browser.close();

const file = fs.readdirSync(out)[0];
fs.renameSync(`${out}/${file}`, 'board-recording.webm');
fs.writeFileSync('acks.json', JSON.stringify(acks, null, 2));
fs.writeFileSync('race.json', JSON.stringify({ aimId, ackedRowId, acks }, null, 2));
console.log('acks:', JSON.stringify(acks));
