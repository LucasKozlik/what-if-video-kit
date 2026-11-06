#!/usr/bin/env node
// Offline, frame-exact export: the page renders frame n on request and we screenshot the whole
// page (canvas + HTML HUD). Work is split across parallel workers, each encoding its own
// segment, then the segments are concatenated and the soundtrack is muxed in.
//   node tools/export.mjs [--fps=30] [--from=0] [--to=61] [--workers=3] [--crf=18] [--out=tools/out/video.mp4]
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const FPS = +flag('fps', 30), W = 1080, H = 1920, CRF = +flag('crf', 18);
const WORKERS = +flag('workers', 3);
const OUT = path.resolve(flag('out', path.join(root, 'tools', 'out', 'video.mp4')));
const SEGDIR = path.join(root, 'tools', 'out', 'seg'); fs.mkdirSync(SEGDIR, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--hide-scrollbars'] });
const url = pathToFileURL(path.join(root, 'index.html')).href + `?render=1&fps=${FPS}&clean`;

const probe = await browser.newPage({ viewport: { width: 270, height: 480 } });
await probe.goto(url); await probe.waitForFunction(() => document.title === 'RENDER_READY', null, { timeout: 300000 });
const info = await probe.evaluate(() => window.exportInfo); await probe.close();
const first = Math.round(+flag('from', 0) * FPS), last = Math.min(info.frames, Math.round(+flag('to', info.duration) * FPS));
const total = last - first, per = Math.ceil(total / WORKERS);
console.log(`Export ${W}x${H} @ ${FPS}fps, frames ${first}..${last} (${total}) on ${WORKERS} workers`);
const t0 = Date.now(); let done = 0;
async function worker(k) {
  const a = first + k * per, b = Math.min(last, a + per); if (a >= b) return null;
  const seg = path.join(SEGDIR, `seg_${k}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF), '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(url); await pg.waitForFunction(() => document.title === 'RENDER_READY', null, { timeout: 300000 });
  for (let n = a; n < b; n++) {
    await pg.evaluate(i => window.renderFrameAt(i), n);
    const buf = await pg.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    done++;
    if (done % 30 === 0) { const el = (Date.now() - t0) / 1000; process.stdout.write(`\r  ${done}/${total}  ${(el / done).toFixed(2)}s/frame (wall)  ETA ${((el / done) * (total - done) / 60).toFixed(1)} min   `); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  if (errs.length) console.log(`\n  worker ${k} page errors: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
  await pg.close();
  return seg;
}
const segs = (await Promise.all(Array.from({ length: WORKERS }, (_, k) => worker(k)))).filter(Boolean);
await browser.close();
console.log(`\n  rendered in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
const list = path.join(SEGDIR, 'list.txt');
fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
const silent = path.join(SEGDIR, 'video_silent.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const wav = path.join(root, 'audio', 'soundtrack.wav');
if (fs.existsSync(wav)) {
  const off = (first / FPS).toFixed(3);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', off, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
} else fs.copyFileSync(silent, OUT);
console.log(`Done: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB)`);
