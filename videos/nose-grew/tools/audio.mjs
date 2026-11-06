#!/usr/bin/env node
// Offline soundtrack synthesizer. Reads the same cue sheet as the picture (js/cues.js), so every
// boing, plip and tink lands on the frame that shows it. No samples, no dependencies.
//   node tools/audio.mjs  ->  audio/soundtrack.wav (44.1 kHz stereo, 16-bit)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = require(path.join(root, 'js', 'cues.js'));

const SR = 44100, N = Math.ceil(C.DURATION * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const MUS_L = new Float32Array(N), MUS_R = new Float32Array(N);   // music bus (ducked under SFX)
let seed = 1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

function put(bufL, bufR, t, x, gain = 1, pan = 0) {
  const i0 = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  for (let i = 0; i < x.length; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; bufL[k] += x[i] * gl; bufR[k] += x[i] * gr; }
}
const sfx = (t, x, g, p) => put(L, R, t, x, g, p);
const mus = (t, x, g, p) => put(MUS_L, MUS_R, t, x, g, p);
const len = s => Math.max(1, Math.round(s * SR));

// state-variable / biquad filter, coefficients settable per sample
function biquad() {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
  const set = (type, f, q) => {
    const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let B0, B1, B2; const A0 = 1 + a;
    if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; }
    else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; }
    else { B0 = a; B1 = 0; B2 = -a; }   // band-pass (constant peak)
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = -2 * c / A0; a2 = (1 - a) / A0;
  };
  const run = x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  return { set, run };
}
const env = (i, n, a, r) => { const t = i / SR; return Math.min(1, t / Math.max(a, 1e-4)) * Math.exp(-t / r); };

// ---------------- instruments ----------------
function marimba(f, dur = 0.5, v = 1) {
  const n = len(dur), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = v * (Math.sin(TAU * f * t) * Math.exp(-t * 6) + 0.35 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t * 22) + 0.12 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t * 45)) * Math.min(1, t / 0.002); }
  return o;
}
function pluck(f, dur = 0.35, v = 1, bright = 0.5) {     // Karplus-Strong pizzicato
  const n = len(dur), o = new Float32Array(n), p = Math.max(2, Math.round(SR / f)), buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = rnd() * 2 - 1;
  let k = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[k], nx = buf[(k + 1) % p];
    const y = (cur * (0.5 + bright * 0.5) + nx * (0.5 - bright * 0.5)) * 0.996;
    buf[k] = y; k = (k + 1) % p;
    o[i] = cur * v * Math.min(1, i / 40) * Math.exp(-i / SR * 5); last = y;
  }
  return o;
}
function bass(f, dur = 0.4, v = 1) {
  const n = len(dur), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const tri = 2 / Math.PI * Math.asin(Math.sin(TAU * f * t)); o[i] = v * (0.7 * Math.sin(TAU * f * t) + 0.3 * tri) * Math.min(1, t / 0.005) * Math.exp(-t * 5); }
  return o;
}
function pad(freqs, dur, v = 1, att = 0.6, rel = 1.0) {
  const n = len(dur + rel), o = new Float32Array(n), lp = biquad(); lp.set('lp', 1400, 0.7);
  const ph = freqs.flatMap(f => [0, 1, 2].map(k => ({ f: f * (1 + (k - 1) * 0.004), p: rnd() })));
  for (let i = 0; i < n; i++) {
    const t = i / SR; let s = 0;
    for (const q of ph) { const x = (q.p + q.f * t) % 1; s += (x * 2 - 1); }
    const e = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / (rel * 0.4)) : 1);
    o[i] = lp.run(s / ph.length) * e * v;
  }
  return o;
}
function kick(v = 1) { const n = len(0.22), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += TAU * (45 + 90 * Math.exp(-t * 30)) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 14) * v; } return o; }
function noiseHit(dur, f, q, type, v = 1, decay = 30) { const n = len(dur), o = new Float32Array(n), b = biquad(); b.set(type, f, q); for (let i = 0; i < n; i++) o[i] = b.run(rnd() * 2 - 1) * Math.exp(-i / SR * decay) * v * Math.min(1, i / 30); return o; }

// ---------------- sound effects ----------------
function boing(f0, dur = 0.7, v = 1) {        // jaw-harp sproing: pitch leaps up, then wobbles out
  const n = len(dur), o = new Float32Array(n); let ph = 0;
  const bp = biquad(); bp.set('bp', f0 * 3, 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 * (1 + 0.9 * (1 - Math.exp(-t * 18))) * (1 + 0.16 * Math.sin(TAU * 13 * t) * Math.exp(-t * 3.5));
    ph += TAU * f / SR;
    const src = Math.sin(ph) + 0.5 * Math.sign(Math.sin(ph)) * 0.6;
    o[i] = (0.7 * Math.sin(ph) + 0.6 * bp.run(src)) * Math.min(1, t / 0.004) * Math.exp(-t * 3.2) * v;
  }
  return o;
}
function sweepTone(f0, f1, dur, v = 1, curve = 1, vib = 0) {
  const n = len(dur), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / n, t = i / SR; const f = f0 + (f1 - f0) * Math.pow(u, curve); ph += TAU * f * (1 + vib * Math.sin(TAU * 6 * t)) / SR; o[i] = Math.sin(ph) * Math.sin(Math.PI * Math.min(1, u * 1.0001)) ** 0.5 * v * (u < 0.9 ? 1 : (1 - u) * 10); }
  return o;
}
function bell(f, dur = 1.6, v = 1) {
  const n = len(dur), o = new Float32Array(n), parts = [[1, 1, 2.2], [2.76, 0.5, 4], [5.4, 0.28, 7], [8.9, 0.12, 10]];
  for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; for (const [m, a, d] of parts) s += a * Math.sin(TAU * f * m * t) * Math.exp(-t * d); o[i] = s * v * Math.min(1, t / 0.001); }
  return o;
}
function giggle(nb, p = 1.3, v = 1) {          // little formant "hee hee" bursts
  const out = new Float32Array(len(nb * 0.115 + 0.2));
  for (let b = 0; b < nb; b++) {
    const f0 = 300 * p * (1 + 0.18 * (1 - b / nb)) * (1 + (rnd() - 0.5) * 0.08);
    const d = 0.075 + rnd() * 0.02, n = len(d), f1 = biquad(), f2 = biquad(); f1.set('bp', 420 * p * 0.9, 5); f2.set('bp', 2400 * Math.sqrt(p), 7);
    let ph = 0; const o0 = Math.round(b * 0.115 * SR);
    for (let i = 0; i < n; i++) {
      const t = i / SR; ph += f0 * (1 + 0.1 * Math.sin(TAU * 25 * t)) / SR;
      const src = (ph % 1) * 2 - 1 + (rnd() - 0.5) * 0.4;
      const e = Math.sin(Math.PI * i / n);
      out[o0 + i] += (f1.run(src) * 1.2 + f2.run(src) * 0.8) * e * v;
    }
  }
  return out;
}
function snore(v = 1) {
  const n = len(1.15), o = new Float32Array(n), lp = biquad(); let ph = 0, lb = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (t < 0.6) {      // inhale: rattly low buzz
      const f = 55 + 10 * Math.sin(TAU * 3 * t); ph += f / SR;
      lb = (lb + 0.02 * (rnd() * 2 - 1)) / 1.02;
      lp.set('lp', 500, 1.5);
      o[i] = lp.run(((ph % 1) - 0.5) * 1.4 + lb * 6) * Math.sin(Math.PI * t / 0.6) * v;
    } else {            // exhale: little whistle
      const u = (t - 0.6) / 0.55; ph += (1500 - 500 * u) / SR;
      o[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * u) * 0.25 * v;
    }
  }
  return o;
}

// ---------------- the score ----------------
const BPM = 112, BEAT = 60 / BPM;
const CH = { F: [53, 57, 60], Dm: [50, 53, 57], Bb: [46, 50, 53], C: [48, 52, 55], Am: [45, 48, 52], Gm: [43, 46, 50] };
const PROG = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'];
// melody (beat offset in a 4-bar phrase, midi, length in beats)
const MEL_A = [[0, 72, .5], [1, 69, .5], [1.5, 72, .5], [2, 77, .75], [3, 76, .5], [3.5, 74, .5],
  [4, 74, .5], [5, 77, .5], [5.5, 81, .5], [6, 79, .5], [6.5, 77, .5], [7, 76, .5], [7.5, 74, .5],
  [8, 74, .5], [9, 70, .5], [9.5, 74, .5], [10, 77, .75], [11, 74, .5], [11.5, 70, .5],
  [12, 72, .5], [12.5, 76, .5], [13, 79, .5], [13.5, 76, .5], [14, 72, 1.5]];
const MEL_B = [[0, 77, .5], [0.5, 76, .5], [1, 77, .5], [2, 81, 1], [3, 79, .5], [3.5, 77, .5],
  [4, 76, .5], [5, 72, .5], [5.5, 76, .5], [6, 79, 1], [7, 77, .5], [7.5, 76, .5],
  [8, 74, .5], [8.5, 72, .5], [9, 70, .5], [10, 74, .5], [10.5, 77, .5], [11, 82, 1],
  [12, 79, .5], [13, 76, .5], [13.5, 79, .5], [14, 77, 1.5]];

const S0 = C.COLD_OPEN, NIGHT0 = C.DAY_T(8), NIGHT1 = C.DAY_T(9), FINALE = C.DAY_T(10);
// bouncy section: Day 1 .. Day 9 (lullaby during Day 8)
for (let bar = 0; ; bar++) {
  const t0 = S0 + bar * 4 * BEAT; if (t0 >= FINALE - 0.05) break;
  const night = t0 >= NIGHT0 - 0.01 && t0 < NIGHT1 - 0.01;
  const ch = CH[PROG[bar % 8]];
  const intro = bar < 1;                   // Day 1 starts sparse: just pluck and bass
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT; if (t >= FINALE - 0.05) break;
    if (!night) {
      if (b % 2 === 0) mus(t, bass(mtof(ch[0] - 12 + (b === 2 ? 7 : 0)), 0.45, 0.55));
      else ch.forEach((m, k) => mus(t + k * 0.004, pluck(mtof(m), 0.25, 0.22, 0.6), 1, (k - 1) * 0.4));
      if (!intro) { if (b % 2 === 0) mus(t, kick(0.35)); mus(t + BEAT / 2, noiseHit(0.05, 8000, 0.7, 'hp', 0.12, 60), 1, 0.3); mus(t, noiseHit(0.04, 9000, 0.7, 'hp', 0.06, 70), 1, -0.3); }
    } else if (b === 0) mus(t, pad(ch.map(mtof), 4 * BEAT - 0.1, 0.16, 0.5, 0.6));
  }
  const mel = (Math.floor(bar / 4) % 2 === 0) ? MEL_A : MEL_B;
  const phraseBar = bar % 4;
  for (const [bo, m, d] of mel) {
    if (bo < phraseBar * 4 || bo >= phraseBar * 4 + 4) continue;
    const t = t0 + (bo - phraseBar * 4) * BEAT; if (t >= FINALE - 0.05 || intro) continue;
    if (night) mus(t, bell(mtof(m + 12), 1.2, 0.07), 1, 0.2);
    else mus(t, marimba(mtof(m), d * BEAT + 0.3, 0.32), 1, 0.15);
  }
}
// finale: warm half-time swell under Day 10 and the end card
const FIN = [['F', 2], ['C', 2], ['Dm', 2], ['Bb', 2], ['F', 2], ['C', 2], ['Bb', 2], ['F', 4]];
let ft = FINALE;
for (const [c, beats] of FIN) {
  const dur = beats * BEAT * 1.6; if (ft >= C.DURATION) break;
  const ch = CH[c];
  mus(ft, pad([...ch.map(mtof), mtof(ch[0] + 12), mtof(ch[0] - 12)], dur, 0.22, 0.5, 1.2));
  mus(ft, bass(mtof(ch[0] - 12), 1.2, 0.5));
  for (let k = 0; k < beats * 2; k++) mus(ft + k * BEAT * 0.8, marimba(mtof(ch[k % 3] + 12), 0.6, 0.12), 1, k % 2 ? 0.4 : -0.4);
  ft += dur;
}
const FMEL = [[0, 72], [1.6, 77], [3.2, 79], [4.8, 81], [6.4, 79], [8.0, 77], [9.6, 76], [11.2, 77], [12.8, 74], [14.4, 72], [16, 77]];
for (const [o, m] of FMEL) { const t = FINALE + 1.0 + o * BEAT * 1.0; if (t < C.DURATION - 1) mus(t, bell(mtof(m), 2.2, 0.12), 1, 0.1); }
// cold open: a held chord under the title
mus(0, pad([mtof(53), mtof(57), mtof(60), mtof(65)], 2.0, 0.2, 0.15, 0.5));

// ---------------- sound effects from the cue sheet ----------------
for (const c of C.CUES) {
  const t = c.t;
  switch (c.k) {
    case 'cut': sfx(t, bell(mtof(84 + [0, 0, 2, 4, 5, 7, 9, 11, 12, 14, 16][c.d]), 0.6, 0.12), 1, 0.3); break;
    case 'boing': sfx(t, boing(Math.max(70, 260 * Math.pow(0.86, c.d)), 0.75, 0.5)); break;
    case 'boingTiny': sfx(t, boing(420, 0.35, 0.18)); break;
    case 'titleHit': sfx(t, boing(140, 0.9, 0.5)); sfx(t, kick(0.7)); sfx(t, noiseHit(1.2, 7000, 0.6, 'hp', 0.12, 3)); break;
    case 'boop': sfx(t, sweepTone(500 * (c.p || 1), 900 * (c.p || 1), 0.12, 0.45)); break;
    case 'plip': sfx(t, sweepTone(1300, 420, 0.09, 0.5, 0.6)); sfx(t + 0.05, sweepTone(800, 1600, 0.06, 0.25)); break;
    case 'slurp': { const n = len(0.45), o = new Float32Array(n), b = biquad(); for (let i = 0; i < n; i++) { const u = i / n; b.set('bp', 700 + 2200 * u, 4); o[i] = b.run(rnd() * 2 - 1) * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(TAU * 30 * i / SR)); } sfx(t, o, 0.5); break; }
    case 'giggle': sfx(t, giggle(c.n || 8, c.p || 1.3, 0.55), 1, (rnd() - 0.5) * 0.6); break;
    case 'click': sfx(t, noiseHit(0.03, 3500, 3, 'bp', 0.6, 120)); break;
    case 'thud': sfx(t, sweepTone(140, 60, 0.18, c.v || 0.6)); sfx(t, noiseHit(0.1, 400, 1, 'lp', 0.4, 30)); break;
    case 'mwah': sfx(t, sweepTone(260, 420, 0.28, 0.25, 1, 0.02)); sfx(t + 0.27, noiseHit(0.03, 2500, 2, 'bp', 0.7, 150)); break;
    case 'zip': { const n = len(0.55), o = new Float32Array(n), b = biquad(); for (let i = 0; i < n; i++) { const u = i / n; b.set('bp', 1200 + 5000 * u, 3); const rat = (i / SR * 70) % 1 < 0.2 ? 1 : 0.25; o[i] = b.run(rnd() * 2 - 1) * rat * (1 - u * 0.5); } sfx(t, o, 0.45, 0.4); break; }
    case 'clack': sfx(t, noiseHit(0.08, 1800, 4, 'bp', 0.9, 45)); sfx(t, sweepTone(320, 220, 0.07, 0.4)); break;
    case 'creak': { const n = len(0.6), o = new Float32Array(n), b = biquad(); b.set('bp', 900, 6); let ph = 0; for (let i = 0; i < n; i++) { const u = i / n; ph += (70 + 30 * Math.sin(TAU * 4 * u)) / SR; o[i] = b.run((ph % 1) * 2 - 1) * Math.sin(Math.PI * u); } sfx(t, o, 0.25, 0.5); break; }
    case 'thunk': sfx(t, sweepTone(170, 70, 0.22, 0.7)); sfx(t, noiseHit(0.12, 600, 1, 'lp', 0.5, 25)); sfx(t + 0.1, giggle(3, 1.6, 0.0)); break;
    case 'whoosh': { const n = len(0.4), o = new Float32Array(n), b = biquad(); for (let i = 0; i < n; i++) { const u = i / n; b.set('bp', 500 + 2500 * u, 1.5); o[i] = b.run(rnd() * 2 - 1) * Math.sin(Math.PI * u); } sfx(t, o, 0.3, -0.3); break; }
    case 'ting': sfx(t, bell(2350 * (0.9 + rnd() * 0.25), 1.6, 0.22 * (c.v || 1)), 1, (rnd() - 0.5) * 0.8); break;
    case 'tink': sfx(t, bell(3800 * (0.85 + rnd() * 0.3), 0.35, 0.15), 1, (rnd() - 0.5) * 0.8); sfx(t + 0.09, bell(4200, 0.2, 0.06)); break;
    case 'snore': sfx(t, snore(0.55)); break;
    case 'slide': sfx(t, sweepTone(1500 * (c.p || 1), 480 * (c.p || 1), 1.15, 0.28, 0.8, 0.03)); break;
    case 'plop': sfx(t, sweepTone(320, 110, 0.14, 0.55)); sfx(t, noiseHit(0.15, 300, 1, 'lp', 0.4, 18)); break;
    case 'thump': sfx(t, sweepTone(120, 45, 0.35, 0.9)); sfx(t, noiseHit(0.3, 250, 1, 'lp', 0.5, 10)); break;
    case 'endChord': sfx(t, bell(mtof(89), 3.0, 0.08), 1, -0.3); sfx(t + 0.12, bell(mtof(93), 3.0, 0.07), 1, 0.3); break;
  }
}
// a little ambience per room: pool water at the end, crickets at night
{
  const b = biquad(); b.set('lp', 420, 0.7); const hp = biquad(); hp.set('hp', 3500, 0.7);
  for (let k = Math.round(C.DAY_T(10) * SR); k < N; k++) { const t = k / SR; const s = b.run(rnd() * 2 - 1) * (0.5 + 0.5 * Math.sin(TAU * 0.4 * t)) * 0.06; L[k] += s; R[k] += s * 0.9; }
  for (let k = Math.round(0 * SR); k < Math.round(C.COLD_OPEN * SR); k++) { const t = k / SR; const s = b.run(rnd() * 2 - 1) * 0.04; L[k] += s; R[k] += s; }
  for (let k = Math.round(NIGHT0 * SR); k < Math.round(NIGHT1 * SR); k++) { const t = k / SR; const chirp = (t * 4.5) % 1 < 0.12 ? Math.sin(TAU * 4300 * t) * Math.sin(TAU * 30 * t) : 0; L[k] += chirp * 0.012; R[k] += chirp * 0.008; }
}

// ---------------- mix: duck music under effects, soft-limit, write ----------------
const envF = new Float32Array(N); { let e = 0; const a = Math.exp(-1 / (0.005 * SR)), r = Math.exp(-1 / (0.25 * SR)); for (let k = 0; k < N; k++) { const x = Math.max(Math.abs(L[k]), Math.abs(R[k])); e = x > e ? a * e + (1 - a) * x : r * e + (1 - r) * x; envF[k] = e; } }
let peak = 0;
for (let k = 0; k < N; k++) {
  const duck = 1 / (1 + envF[k] * 2.2);
  const fadeOut = Math.min(1, (C.DURATION - k / SR) / 1.2);
  L[k] = (L[k] + MUS_L[k] * duck) * fadeOut; R[k] = (R[k] + MUS_R[k] * duck) * fadeOut;
  peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
}
const g = 0.95 / Math.max(0.3, peak) * 1.6;
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) {
  const l = Math.tanh(L[k] * g) * 0.92, r = Math.tanh(R[k] * g) * 0.92;
  out.writeInt16LE(Math.round(l * 32767), 44 + k * 4); out.writeInt16LE(Math.round(r * 32767), 46 + k * 4);
}
fs.mkdirSync(path.join(root, 'audio'), { recursive: true });
fs.writeFileSync(path.join(root, 'audio', 'soundtrack.wav'), out);
console.log(`audio/soundtrack.wav  ${C.DURATION}s  peak-norm gain ${g.toFixed(2)}  cues ${C.CUES.length}`);
