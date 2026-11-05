#!/usr/bin/env node
// Offline, deterministic soundtrack for "What if everyone was geeked?" -> tools/out/soundtrack.wav
// Shape: party (cold open) -> calm Monday -> riser + DROP at 8:01 -> a wobbly, detuned goofy beat
// with honks, a siren and crowd -> total SILENCE on "WAIT." -> hungover quiet, one cricket ->
// a dramatic "dun dun DUN" for the dog -> soft end card.
//   node tools/soundtrack.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100, D = 61, N = SR * D;
const L = new Float32Array(N), R = new Float32Array(N);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(808);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// film sections
const COLD = 2.4, G0 = 6.0, WAIT0 = 41.0, SOBER = 44.2, DOG = 50.0, END = 56.0;
const geekAmt = t => t < COLD ? 1 : smooth(G0, G0 + 0.3, t) * (1 - smooth(WAIT0 - 0.05, WAIT0, t));

function tone(t0, dur, f, { wave = 'sine', amp = 0.1, pan = 0.5, a = 0.005, r = 0.08, vib = 0, vibF = 5 } = {}) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let j = 0; j < n && s0 + j < N; j++) {
    const u = j / SR, ff = (typeof f === 'function' ? f(u) : f) * (1 + vib * Math.sin(6.283 * vibF * u));
    ph += ff / SR; const p = ph % 1;
    let v = wave === 'sine' ? Math.sin(6.283 * p) : wave === 'saw' ? 2 * p - 1 : wave === 'sq' ? (p < 0.5 ? 1 : -1) : 1 - 4 * Math.abs(p - 0.5);
    const env = Math.min(1, u / a) * Math.min(1, (dur - u) / r);
    v *= env * amp; L[s0 + j] += v * (1 - pan) * 2 * 0.5; R[s0 + j] += v * pan * 2 * 0.5;
  }
}
function noise(t0, dur, { amp = 0.1, lp = 0.2, decay = 0, pan = 0.5, a = 0.002 } = {}) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let y = 0;
  for (let j = 0; j < n && s0 + j < N; j++) {
    const u = j / SR; y += ((rnd() * 2 - 1) - y) * lp;
    const env = Math.min(1, u / a) * (decay ? Math.exp(-u * decay) : Math.min(1, (dur - u) / 0.05));
    L[s0 + j] += y * amp * env * (1 - pan); R[s0 + j] += y * amp * env * pan;
  }
}
const kick = (t, amp = 0.5) => tone(t, 0.32, u => 48 + 110 * Math.exp(-u * 28), { amp, a: 0.001, r: 0.2 });
const snare = (t, amp = 0.18) => { noise(t, 0.2, { amp, lp: 0.6, decay: 18 }); tone(t, 0.1, 190, { wave: 'tri', amp: amp * 0.5, r: 0.06 }); };
const hat = (t, amp = 0.05) => noise(t, 0.05, { amp, lp: 0.95, decay: 70, pan: 0.6 });

// ---- COLD OPEN: party ----
for (let t = 0; t < COLD; t += 0.5) { kick(t, 0.5); hat(t + 0.25); }
for (let t = 0.5; t < COLD; t += 1) snare(t);
noise(0, COLD, { amp: 0.06, lp: 0.08 });                                  // crowd roar
for (const [t, m] of [[0, 40], [0.5, 40], [1.0, 43], [1.5, 38]]) tone(t, 0.45, mtof(m), { wave: 'saw', amp: 0.14, vib: 0.03 });
// air-horn hits
for (const t of [0.05, 0.3, 1.55]) for (const m of [70, 74, 77]) tone(t, 0.22, mtof(m), { wave: 'saw', amp: 0.035, vib: 0.01, vibF: 7 });

// ---- 8:00 AM: a calm Monday ----
noise(COLD, G0 - COLD, { amp: 0.05, lp: 0.02 });                          // traffic hum
{ const mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84];
  mel.forEach((m, i) => tone(COLD + 0.08 + i * 0.3, 0.32, mtof(m), { wave: 'tri', amp: 0.07, a: 0.003, r: 0.25, pan: 0.4 + 0.2 * (i % 2) })); }
for (let i = 0; i < 6; i++) { const t = COLD + rnd() * 3.4, f = 3000 + rnd() * 1500; tone(t, 0.12, u => f + 1500 * u, { amp: 0.04, pan: rnd() }); }
// riser into the drop
tone(4.6, G0 - 4.6, u => 200 + 1600 * Math.pow(u / 1.4, 2), { wave: 'saw', amp: 0.05, a: 1.2, r: 0.02 });
noise(4.4, G0 - 4.4, { amp: 0.14, lp: 0.5, a: 1.5 });

// ---- THE DROP ----
tone(G0, 1.6, u => 32 + 90 * Math.exp(-u * 6), { amp: 0.7, a: 0.001, r: 0.6 });
noise(G0, 1.2, { amp: 0.35, lp: 0.3, decay: 3 });
tone(G0, 0.9, u => 900 * Math.exp(-u * 4), { wave: 'sq', amp: 0.05 });          // the "bwooop"

// ---- THE GEEKED BEAT: 100 bpm, everything slightly out of tune ----
{ const bt = 60 / 100, start = G0 + 1.2;
  const bass = [36, 36, 39, 36, 41, 39, 34, 36];
  const kaz = [67, 70, 72, 70, 67, 65, 63, 65, 67, 70, 75, 74, 72, 70, 67, 0];
  for (let b = 0, t = start; t < WAIT0 - 0.05; b++, t += bt) {
    const plane = t > 23 && t < 26, fullness = 0.7 + 0.3 * smooth(34, 40, t);
    kick(t, plane ? 0.18 : 0.5 * fullness);
    if (b % 2 === 1) snare(t, plane ? 0.06 : 0.17);
    hat(t + bt / 2, 0.04);
    // drunk bassline: pitch wobbles, notes slide
    const m = bass[b % bass.length], dur = Math.min(bt * 0.95, WAIT0 - t);
    tone(t, dur, u => mtof(m) * (1 + 0.04 * Math.sin(u * 9 + b)), { wave: 'saw', amp: plane ? 0.04 : 0.11, vib: 0.015, vibF: 3, r: 0.05 });
    // a kazoo-ish lead, two notes per beat, bending
    for (const h of [0, 1]) {
      const k = kaz[(b * 2 + h) % kaz.length]; if (!k) continue;
      const tt = t + h * bt / 2; if (tt > WAIT0 - 0.1) continue;
      tone(tt, bt / 2 * 0.9, u => mtof(k) * (1 - 0.03 * Math.exp(-u * 12)), { wave: 'sq', amp: plane ? 0.012 : 0.03, vib: 0.025, vibF: 6, pan: 0.35 });
    }
  }
}
// car horns + crunches as traffic falls apart
for (const t of [11.2, 11.9, 12.6, 13.1, 13.5]) { tone(t, 0.35, 392, { wave: 'sq', amp: 0.04, pan: rnd() }); tone(t, 0.35, 494, { wave: 'sq', amp: 0.03, pan: rnd() }); }
for (const t of [10.6, 12.1, 13.2]) noise(t, 0.35, { amp: 0.25, lp: 0.25, decay: 9 });
// cabin chime + engine hum at 35,000 ft
tone(23.25, 0.9, 1318.5, { amp: 0.08, r: 0.7 }); tone(23.55, 1.2, 1046.5, { amp: 0.08, r: 1.0 });
noise(23, 3, { amp: 0.09, lp: 0.03 });
// a siren for the dancing cop
tone(29, 3, u => 700 + 350 * Math.sin(u * 6.283 * 0.9), { wave: 'tri', amp: 0.05, a: 0.3, r: 0.4, pan: 0.6 });
// the crowd swells with the circle
{ const s0 = 35 * SR; let y = 0;
  for (let i = s0; i < WAIT0 * SR; i++) { const t = i / SR; y += ((rnd() * 2 - 1) - y) * 0.09; const a = 0.1 * smooth(35, 40.5, t); L[i] += y * a; R[i] += y * a * 0.9; } }
// cheers on "40,000 people"
noise(38.05, 1.2, { amp: 0.14, lp: 0.3, decay: 2 });

// ---- WAIT. : hard cut to silence, one low hit, a held dark drone ----
tone(WAIT0, 2.2, u => 41 * (1 - u * 0.05), { amp: 0.55, a: 0.002, r: 1.6 });
tone(42.6, SOBER - 42.6, 55, { amp: 0.06, a: 0.4, r: 0.4 }); tone(42.6, SOBER - 42.6, 58.27, { amp: 0.05, a: 0.4, r: 0.4 });

// ---- the morning after: quiet, birds, then the cricket ----
for (let i = 0; i < 5; i++) { const t = SOBER + 0.3 + i * 0.6, f = 2800 + rnd() * 1200; tone(t, 0.1, u => f + 1200 * u, { amp: 0.035, pan: rnd() }); }
for (let t = 47.4; t < DOG - 0.2; t += 0.75) for (let k = 0; k < 3; k++) tone(t + k * 0.05, 0.035, 4600, { amp: 0.05, a: 0.002, r: 0.015, pan: 0.7 });

// ---- the dog: a curious "hm?" on the head tilt, then DUN DUN DUNNN ----
tone(50.2, 0.35, u => 420 + 380 * u, { wave: 'tri', amp: 0.08 });
for (const [t, m, d] of [[53.0, 43, 0.28], [53.35, 43, 0.28], [53.7, 39, 1.4]]) {
  for (const o of [0, 12, 19]) tone(t, d, mtof(m + o), { wave: 'saw', amp: 0.06, vib: o ? 0.006 : 0, r: d * 0.5 });
  kick(t, 0.45);
}
{ const box = [79, 84, 86, 84, 79, 76, 79];                     // music box under "never look at you the same"
  box.forEach((m, i) => tone(54.8 + i * 0.22, 0.4, mtof(m), { amp: 0.05, a: 0.002, r: 0.35, pan: 0.45 })); }

// ---- end card: soft pad + light beat ----
for (const m of [48, 55, 60, 64]) tone(END, D - END, mtof(m), { wave: 'tri', amp: 0.035, a: 0.8, r: 1.6 });
for (let t = END + 0.6; t < D - 1.4; t += 0.6) { kick(t, 0.22); hat(t + 0.3, 0.025); }

// gentle wobble on everything while geeked (a slow stereo detune is what sells "geeked" by ear)
{ const dl = Math.floor(0.012 * SR), bufL = Float32Array.from(L), bufR = Float32Array.from(R);
  for (let i = dl; i < N; i++) {
    const t = i / SR, g = geekAmt(t); if (g <= 0) continue;
    const off = Math.floor(dl * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.4)));
    L[i] = bufL[i] * (1 - 0.35 * g) + bufL[i - off] * 0.35 * g;
    R[i] = bufR[i] * (1 - 0.35 * g) + bufR[i - (dl - off)] * 0.35 * g;
  } }

let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(root, 'tools', 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'out', 'soundtrack.wav'), buf);
console.log(`soundtrack.wav written (gain ${g.toFixed(2)})`);
