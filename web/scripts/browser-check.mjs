// Browser check at 390 px and 1440 px with Playwright + system Chromium.
// Supabase is replaced by a local fixture (tests/fixture-server.mjs) so every screen can render, signed in or out.
// Checks per screen: concept strip visible, no sideways scroll, no console errors. Screenshots go to .shots/ (git-ignored).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { installFixture, scenarios } from '../tests/fixture-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..');
const shots = path.join(web, '.shots'); mkdirSync(shots, { recursive: true });
const STRIP = 'Concept prototype by Sameer Mittimani. Not an official Rapido product.';
const PORT = 4173;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: web, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
let fail = 0, total = 0;
try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    for (const sc of scenarios) {
      total++;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
      const state = await installFixture(ctx, page, sc);
      await page.goto(`http://localhost:${PORT}/${sc.search ?? ''}#${sc.hash}`);
      await page.waitForSelector(sc.waitFor ?? 'main', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(sc.settle ?? 600);
      if (sc.act) { await sc.act(page, state); await page.waitForTimeout(400); }
      const stripOk = await page.getByText(STRIP, { exact: true }).first().isVisible().catch(() => false);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const textOk = sc.expect ? await page.getByText(sc.expect).first().isVisible().catch(() => false) : true;
      await page.screenshot({ path: path.join(shots, `${sc.name}-${w}.png`), fullPage: false });
      const verifyMsg = sc.verify ? sc.verify(state) : null;
      if (verifyMsg) errors.push(verifyMsg);
      const ok = stripOk && overflow <= 1 && !errors.length && textOk;
      if (!ok) fail++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(w).padStart(4)}px ${sc.name}${stripOk ? '' : '  [no concept strip]'}${overflow > 1 ? `  [sideways scroll ${overflow}px]` : ''}${textOk ? '' : `  [missing "${sc.expect}"]`}${errors.length ? '  [' + errors[0].slice(0, 120) + ']' : ''}`);
      await ctx.close();
    }
  }
} finally { await browser.close(); server.kill(); }
console.log(fail ? `\nBrowser check FAILED: ${fail} of ${total}` : `\nBrowser check passed: ${total} screen/width pairs`);
process.exit(fail ? 1 : 0);
