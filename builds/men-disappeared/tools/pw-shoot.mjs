// Playwright preview harness: node tools/pw-shoot.mjs 3 6.2 9 [--w=540] [--q=extra=params]
import { chromium } from 'playwright';
import path from 'path'; import fs from 'fs'; import { fileURLToPath, pathToFileURL } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const times = argv.filter(a => !a.startsWith('--'));
const W = +flag('w', 540), H = Math.round(W * 16 / 9), extra = flag('q', '');
const out = path.join(root, 'tools', 'shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
for (const t of times) {
  const url = pathToFileURL(path.join(root, 'index.html')).href + `?shot=${t}${extra ? '&' + extra : ''}`;
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => document.title === 'SHOT_READY' || document.getElementById('err').textContent, null, { timeout: 120000 });
  const file = path.join(out, `t_${String(t).replace('.', '_')}${flag('tag', '')}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.simStats ? window.simStats() : null);
  console.log(file, `${Date.now() - t0}ms`, JSON.stringify(stats?.info || {}));
}
if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].join('\n'));
await browser.close();
