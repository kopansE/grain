// Screenshot helper for local verification. Uses the installed Chrome via puppeteer-core
// (no browser download). Emulates a real phone viewport when --mobile is passed and
// prints any console errors / page errors so a broken page is obvious.
//
//   node scripts/shot.mjs <url> <out.png> [--mobile] [--wait 1500] [--full]
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--mobile] [--wait ms] [--full]');
  process.exit(2);
}
const mobile = args.includes('--mobile');
const full = args.includes('--full');
const waitIdx = args.indexOf('--wait');
const wait = waitIdx >= 0 ? Number(args[waitIdx + 1]) : 1200;
// --click <selector> may repeat; each click is followed by a short wait. Text selectors: "::-p-text(Save lead)".
const clicks = args.flatMap((a, i) => (a === '--click' ? [args[i + 1]] : []));
const typeIdx = args.indexOf('--type');
const typing = typeIdx >= 0 ? { selector: args[typeIdx + 1], text: args[typeIdx + 2] } : undefined;

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const { existsSync } = await import('node:fs');
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Chrome not found');
  process.exit(2);
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText ?? ''}`));

if (mobile) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  );
} else {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
}

try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
} catch (e) {
  console.log(`(navigation did not go idle: ${e.message.split('\n')[0]}; taking the screenshot anyway)`);
}
await new Promise((r) => setTimeout(r, wait));
if (typing) {
  await page.type(typing.selector, typing.text, { delay: 20 });
  await new Promise((r) => setTimeout(r, 600));
}
for (const sel of clicks) {
  try {
    await page.click(sel);
    await new Promise((r) => setTimeout(r, 900));
  } catch (e) {
    console.log(`(click failed for ${sel}: ${e.message.split('\n')[0]})`);
  }
}
await page.screenshot({ path: out, fullPage: full });
await browser.close();

console.log(`saved ${out}`);
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems.slice(0, 30)) console.log('  ' + p);
} else {
  console.log('no console errors');
}
