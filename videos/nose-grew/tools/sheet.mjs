// node tools/sheet.mjs out.png t1 t2 ...  -> tiles tools/shots/t_<t>.png into one contact sheet (5 across)
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out, ...times] = process.argv.slice(2);
const cols = Math.min(5, times.length), rows = Math.ceil(times.length / cols);
const inputs = times.flatMap(t => ['-i', path.join(root, 'tools', 'shots', `t_${String(t).padStart(5, '0')}.png`)]);
const sc = times.map((t, i) => `[${i}:v]scale=270:480,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${t}':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[s${i}]`).join(';');
const pad = Array.from({ length: rows * cols - times.length }, (_, k) => `color=black:270x480:d=1[p${k}]`);
const labels = times.map((_, i) => `[s${i}]`).join('') + pad.map((_, k) => `[p${k}]`).join('');
const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|');
const filter = (pad.length ? pad.join(';') + ';' : '') + sc + ';' + labels + `xstack=inputs=${rows * cols}:layout=${layout}`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', path.join(root, 'tools', 'shots', out)]);
console.log('tools/shots/' + out);
