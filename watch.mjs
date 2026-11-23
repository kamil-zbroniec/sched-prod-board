import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({locale:'en-GB', timezoneId:'Europe/Warsaw'})).newPage();
page.on('console', m => console.log('CONSOLE', m.text().slice(0,120)));
await page.goto('https://kamil-zbroniec.github.io/sched-prod-board/app/');
await page.waitForSelector('[data-testid="incident-row"]', {timeout:20000});
console.log('board open, watching...');
let last = await page.locator('[data-testid="incident-row"]').first().getAttribute('data-id');
const t0 = Date.now();
for (let i = 0; i < 90; i++) {
  await page.waitForTimeout(2000);
  const top = await page.locator('[data-testid="incident-row"]').first().getAttribute('data-id');
  const count = await page.locator('[data-testid="incident-row"]').count();
  if (top !== last) { console.log('NEW INCIDENT LANDED at', Math.round((Date.now()-t0)/1000), 's, top id:', top, 'count:', count); last = top; }
}
console.log('watch done');
await browser.close();
