// Offline frame-exact export with Playwright (Linux / headless SwiftShader).
//   node tools/pw-export.mjs --fps=30 --w=720 --from=0 --to=41.5 --dir=frames_a
import { chromium } from 'playwright';
import path from 'path'; import fs from 'fs'; import { fileURLToPath, pathToFileURL } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const FPS = +flag('fps', 30), W = +flag('w', 720), H = Math.round(W * 16 / 9);
const dir = path.join(root, 'tools', flag('dir', 'frames')); fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(pathToFileURL(path.join(root, 'index.html')).href + `?render=1&fps=${FPS}&clean`);
await p.waitForFunction(() => document.title === 'RENDER_READY', null, { timeout: 120000 });
const info = await p.evaluate(() => window.exportInfo);
const first = Math.round(+flag('from', 0) * FPS), last = Math.min(info.frames, Math.round(+flag('to', info.duration) * FPS));
const t0 = Date.now();
for (let i = first; i < last; i++) {
  const f = path.join(dir, `f_${String(i).padStart(6, '0')}.png`);
  if (fs.existsSync(f)) continue;
  await p.evaluate(n => window.renderFrameAt(n), i);
  await p.screenshot({ path: f });
  if ((i - first) % 30 === 0) { const d = i - first + 1, el = (Date.now() - t0) / 1000; console.log(`frame ${i} (${d}/${last - first}) ${(el / d).toFixed(2)}s/f`); }
}
if (errs.length) console.log('ERRORS', [...new Set(errs)].join('\n'));
await b.close();
console.log('done', first, last);
