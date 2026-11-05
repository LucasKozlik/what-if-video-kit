#!/usr/bin/env node
// Offline, deterministic soundtrack -> tools/out/soundtrack.wav (44.1 kHz stereo, 61 s).
// The emotional shape is one contrast: a meadow full of buzz and birdsong, then the insects
// vanish (6.6-8.6 s) and the buzz never comes back. Birdsong thins with the birds; a low
// pad grows underneath as the world goes brown.
//   node tools/soundtrack.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100, D = 61, N = SR * D;
const L = new Float32Array(N), R = new Float32Array(N);

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2024);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lin = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return keys[i][1] + (keys[i + 1][1] - keys[i][1]) * (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]); return keys[keys.length - 1][1]; };

// story mirrors js/field.js
const COLD = 2.6, V0 = 6.6, V1 = 8.6;
const story = t => t < COLD ? 50 : t;
const insects = t => 1 - clamp((story(t) - V0) / (V1 - V0), 0, 1);
const birds = t => lin([[0, 1], [17.5, 1], [20, 0.82], [23.5, 0.5], [30, 0.36], [44, 0.22], [52, 0.08], [61, 0.06]], story(t));

// ---- wind: filtered noise, slow gusts, everywhere ----
{ let lp1 = 0, lp2 = 0, lp1r = 0, lp2r = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, g = 0.5 + 0.5 * Math.sin(t * 0.31) * Math.sin(t * 0.17 + 1);
    const a = 0.012 + 0.02 * g + 0.012 * smooth(20, 55, story(t));
    lp1 += (rnd() * 2 - 1 - lp1) * 0.02; lp2 += (lp1 - lp2) * 0.05;
    lp1r += (rnd() * 2 - 1 - lp1r) * 0.02; lp2r += (lp1r - lp2r) * 0.05;
    L[i] += lp2 * a * 6; R[i] += lp2r * a * 6;
  } }

// ---- the buzz: many detuned bees + a field of crickets/grasshoppers ----
{ const bees = Array.from({ length: 14 }, () => ({ f: 180 + rnd() * 120, p: rnd() * 6.28, am: 2 + rnd() * 5, pan: rnd(), wob: rnd() * 6 }));
  const crk = Array.from({ length: 10 }, () => ({ f: 3800 + rnd() * 1800, rate: 9 + rnd() * 9, ph: rnd(), pan: rnd(), on: rnd() * 6 }));
  const ph = bees.map(() => 0), cph = crk.map(() => 0);
  for (let i = 0; i < N; i++) {
    const t = i / SR, live = insects(t);
    if (live <= 0) continue;
    // the buzz stops raggedly, like the insects do
    const fade = Math.pow(live, 1.5);
    let l = 0, r = 0;
    bees.forEach((b, k) => {
      const f = b.f * (1 + 0.04 * Math.sin(t * 1.3 + b.wob));
      ph[k] += f / SR; const saw = (ph[k] % 1) * 2 - 1;
      const amp = (0.5 + 0.5 * Math.sin(t * b.am + b.p)) * 0.006 * (k / bees.length < live ? 1 : 0);
      l += saw * amp * (1 - b.pan); r += saw * amp * b.pan;
    });
    crk.forEach((c, k) => {
      cph[k] += c.f / SR;
      const pulse = Math.pow(Math.max(0, Math.sin((t * c.rate + c.ph) * Math.PI * 2)), 8) * (Math.sin(t * 0.7 + c.on) > -0.3 ? 1 : 0);
      const s = Math.sin(cph[k] * 6.283) * pulse * 0.01 * (k / crk.length < live ? 1 : 0);
      l += s * (1 - c.pan); r += s * c.pan;
    });
    L[i] += l * fade * 5; R[i] += r * fade * 5;
  } }

// ---- birdsong: chirp phrases, rarer as birds disappear ----
{ let t = 2.6;
  while (t < 56) {
    const b = t < COLD ? 0.08 : birds(t);
    const gap = 0.25 + rnd() * 1.2 / Math.max(b, 0.05);
    t += gap;
    if (rnd() > b) continue;
    const notes = 2 + Math.floor(rnd() * 5), f0 = 2200 + rnd() * 2200, pan = rnd(), sweep = (rnd() - 0.4) * 1800;
    let s0 = Math.floor(t * SR), ph = 0;
    for (let n = 0; n < notes; n++) {
      const len = 0.05 + rnd() * 0.09, n0 = s0 + Math.floor(n * (len + 0.04) * SR);
      for (let j = 0; j < len * SR && n0 + j < N; j++) {
        const u = j / (len * SR), f = f0 + sweep * u + 300 * Math.sin(u * 30);
        ph += f / SR;
        const env = Math.sin(Math.PI * u) ** 2, s = Math.sin(ph * 6.283) * env * 0.07;
        L[n0 + j] += s * (1 - pan); R[n0 + j] += s * pan;
      }
    }
  } }

// ---- sparks: a glassy shimmer as each insect blinks out ----
{ for (let k = 0; k < 90; k++) {
    const t0 = V0 + rnd() * (V1 - V0), f = 2600 + rnd() * 3600, pan = rnd(), s0 = Math.floor(t0 * SR);
    for (let j = 0; j < SR * 0.6; j++) {
      const u = j / SR, s = Math.sin(6.283 * f * u) * Math.exp(-u * 9) * 0.02;
      L[s0 + j] += s * (1 - pan); R[s0 + j] += s * pan;
    } } }

// ---- pad: a low, slowly swelling minor chord as the world goes brown ----
{ const chord = [55, 82.41, 110, 130.81, 164.81];       // A1 E2 A2 C3 E3
  for (let i = 0; i < N; i++) {
    const t = i / SR, s = story(t);
    let a = 0.05 * smooth(8, 14, s) + 0.09 * smooth(24, 50, s);
    if (t < COLD) a = 0.11 * smooth(0, 0.6, t) * (1 - smooth(2.3, 2.6, t));
    a *= 1 - smooth(59.5, 61, t);
    if (a <= 0) continue;
    let v = 0;
    chord.forEach((f, k) => { v += Math.sin(6.283 * f * t * (1 + k * 0.0007)) * (1 / (k + 1.5)) * (0.7 + 0.3 * Math.sin(t * 0.21 + k)); });
    // end card: the chord opens onto a major third, a little lift for the question
    const lift = smooth(56, 58, t);
    v += Math.sin(6.283 * 138.59 * t) * 0.25 * lift - Math.sin(6.283 * 130.81 * t) * 0.25 * lift;
    L[i] += v * a * 0.55; R[i] += v * a * 0.55;
  } }

// ---- a soft low hit on the cut from the cold open to "today", and on the vanishing ----
for (const [t0, f, amp] of [[2.6, 48, 0.1], [V0, 41, 0.07]]) {
  const s0 = Math.floor(t0 * SR);
  for (let j = 0; j < SR * 2.5; j++) { const u = j / SR, s = Math.sin(6.283 * f * u * (1 - u * 0.05)) * Math.exp(-u * 1.8) * amp; L[s0 + j] += s; R[s0 + j] += s; }
}

// normalise to -1 dBFS and write 16-bit WAV
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(root, 'tools', 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'out', 'soundtrack.wav'), buf);
console.log(`soundtrack.wav written (peak gain ${g.toFixed(2)})`);
