#!/usr/bin/env node
// Headless preview harness (Playwright + Chromium software WebGL).
//   node tools/shoot.mjs 12 28 41 [--tag=x] [--q="cam=..&look=.."] [--w=540 --h=960]
// Writes tools/shots/t_<time>[_tag].png and prints page errors.
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const times = argv.filter(a => !a.startsWith('--')).map(Number).filter(n => !Number.isNaN(n));
const W = +flag('w', 540), H = +flag('h', 960), tag = flag('tag', ''), extra = flag('q', ''), CONC = +flag('conc', 3);
const outDir = path.join(root, 'tools', 'shots'); fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
async function shoot(t) {
  const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = [];
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  pg.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  const url = pathToFileURL(path.join(root, 'index.html')).href + `?shot=${t}&clean` + (extra ? '&' + extra : '');
  try {
    await pg.goto(url, { timeout: 300000 });
    await pg.waitForFunction(() => document.title === 'SHOT_READY' || document.getElementById('err').textContent, null, { timeout: 300000, polling: 200 });
  } catch (e) { logs.push('WAIT FAILED: ' + e.message.split('\n')[0]); }
  const name = `t_${String(t).padStart(5, '0')}${tag ? '_' + tag : ''}.png`;
  await pg.screenshot({ path: path.join(outDir, name) });
  const info = await pg.evaluate(() => { const o = {}; try { o.calls = renderer.info.render.calls; o.tris = renderer.info.render.triangles; o.s = simStats(); } catch (e) {} return o; }).catch(() => ({}));
  console.log(`t=${t} -> ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s) ${JSON.stringify(info)}`);
  [...new Set(logs)].slice(0, 12).forEach(m => console.log('   ' + m.slice(0, 400)));
  await pg.close();
}
for (let i = 0; i < times.length; i += CONC) await Promise.all(times.slice(i, i + CONC).map(shoot));
await browser.close();
