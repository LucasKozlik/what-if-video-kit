#!/usr/bin/env node
// Offline, deterministic soundtrack for "What if everyone sneezed at the same time?" -> tools/out/soundtrack.wav
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


const COLD = 2.5, CHOO = 10.6, WAIT0 = 41.0, WAIT1 = 44.0;
// a sneeze: breathy "ah" swell, then the "CHOO" (noise burst + falling formant + sub)
function choo(t, amp = 1, muffle = 0, pan = 0.5) {
  noise(t - 0.05, 0.08, { amp: 0.15 * amp, lp: 0.6 - muffle * 0.5, decay: 30, pan });
  noise(t, 0.5, { amp: 0.5 * amp, lp: 0.45 - muffle * 0.38, decay: 7, pan });
  tone(t, 0.32, u => 340 - 180 * u, { wave: 'saw', amp: 0.07 * amp * (1 - muffle * 0.7), r: 0.2, pan });
  tone(t, 0.25, u => 1250 - 500 * u, { wave: 'tri', amp: 0.035 * amp * (1 - muffle), r: 0.15, pan });
}
function ah(t, dur, amp = 1) {
  noise(t, dur, { amp: 0.06 * amp, lp: 0.12, a: dur * 0.7 });
  tone(t, dur, u => 700 + 120 * u / dur, { wave: 'tri', amp: 0.02 * amp, a: dur * 0.6, r: 0.08 });
  tone(t, dur, u => 1150 + 200 * u / dur, { amp: 0.012 * amp, a: dur * 0.6, r: 0.08 });
}

// ---- COLD OPEN: the stadium, mid-sneeze ----
noise(0, COLD, { amp: 0.09, lp: 0.07 });
for (let k = 0; k < 18; k++) choo(0.05 + (k * 0.037) % 0.5 + 0.02 * Math.sin(k), 0.35, 0.2, 0.2 + 0.6 * ((k * 7) % 10) / 10);
tone(0, 1.6, u => 34 + 60 * Math.exp(-u * 7), { amp: 0.16, a: 0.001, r: 0.8 });
for (const m of [45, 52, 57]) tone(0.3, 2.1, mtof(m), { wave: 'saw', amp: 0.02, a: 0.4, r: 0.6, vib: 0.004 });

// ---- 11:59:57: the city, and a clock that ticks slower than it should ----
noise(COLD, CHOO - COLD, { amp: 0.09, lp: 0.025 });
for (let i = 0; i < 5; i++) { const t = COLD + 0.3 + rnd() * 3, f = 2900 + rnd() * 1400; tone(t, 0.1, u => f + 1300 * u, { amp: 0.03, pan: rnd() }); }
{ let t = COLD + 0.1, k = 0;
  while (t < CHOO - 0.05) { tone(t, 0.035, k % 2 ? 1500 : 2200, { wave: 'sq', amp: 0.035, a: 0.001, r: 0.02, pan: 0.6 }); k++; t += Math.max(0.12, 0.62 - (t - COLD) * 0.06); } }
// ah... ah... (on the two stutters of the inhale) and a riser into the CHOO
ah(6.6, 0.9, 0.8); ah(8.1, 0.8, 1.0); ah(9.4, 1.15, 1.25);
tone(7.2, CHOO - 7.2, u => 180 + 900 * Math.pow(u / (CHOO - 7.2), 2.2), { wave: 'saw', amp: 0.035, a: 2.5, r: 0.02 });
noise(8.6, CHOO - 8.6, { amp: 0.1, lp: 0.35, a: 1.8 });

// ---- CHOO ----
choo(CHOO, 1.6, 0, 0.5);
for (let k = 0; k < 24; k++) choo(CHOO + 0.02 + rnd() * 0.18, 0.28, 0.4, rnd());     // the whole sidewalk
tone(CHOO, 2.0, u => 30 + 80 * Math.exp(-u * 6), { amp: 0.22, a: 0.001, r: 0.9 });
// droplet shimmer
for (let k = 0; k < 80; k++) { const t = CHOO + 0.1 + rnd() * 2.2, f = 3000 + rnd() * 4500; tone(t, 0.5, f, { amp: 0.012, a: 0.002, r: 0.45, pan: rnd() }); }

// ---- 13-19: slow-motion myth-buster ----
tone(13, 6, 55, { amp: 0.07, a: 0.8, r: 0.6 }); tone(13, 6, 82.4, { amp: 0.04, a: 0.8, r: 0.6 });
noise(13, 1.3, { amp: 0.12, lp: 0.08, a: 1.0 });                          // the slowed CHOO
for (let u = 0; u < 1.2; u += 0.03) tone(13.25 + u, 0.05, 120 + u * 1200, { wave: 'sq', amp: 0.01 });   // needle climbing to "100"
tone(14.6, 0.5, 110, { wave: 'sq', amp: 0.08, r: 0.1 }); tone(14.6, 0.5, 116.5, { wave: 'sq', amp: 0.06, r: 0.1 });  // MYTH buzzer
for (let u = 0; u < 1.0; u += 0.03) tone(16.0 + u, 0.05, 1300 - u * 1100, { wave: 'sq', amp: 0.01 });  // needle falling to "10"
for (const [t, m] of [[17.05, 84], [17.2, 88], [17.35, 91]]) tone(t, 0.6, mtof(m), { amp: 0.05, r: 0.5 });

// ---- 19-25: the cloud ----
noise(19, 6, { amp: 0.09, lp: 0.03 });
for (let k = 0; k < 60; k++) { const t = 19.2 + rnd() * 5.6, f = 3500 + rnd() * 3500; tone(t, 0.6, f, { amp: 0.008, a: 0.002, r: 0.55, pan: rnd() }); }
for (let m = 1; m <= 7; m++) tone(19 + m * 0.62, 0.04, 2600, { wave: 'tri', amp: 0.03, a: 0.001, r: 0.03 });   // tape ticks
for (const m of [57, 64, 69, 72]) tone(19, 6, mtof(m), { wave: 'tri', amp: 0.012, a: 1.5, r: 1.5 });

// ---- 25-31: the highway ----
{ const s0 = 25 * SR, s1 = 31 * SR; let y = 0;
  for (let i = s0; i < s1; i++) { const t = i / SR; y += ((rnd() * 2 - 1) - y) * (t > 28 && t < 29 ? 0.02 : 0.08);
    const a = 0.26 * smooth(25, 25.4, t) * (1 - smooth(30.7, 31, t)); L[i] += y * a; R[i] += y * a * 0.95; } }
tone(28.0, 1.0, 60, { amp: 0.06, a: 0.05, r: 0.2 });                        // eyes shut: everything muffles
choo(27.95, 0.6, 0.5, 0.45);
for (let k = 0; k < 6; k++) { const t = 29.05 + k * 0.13; tone(t, 1.0, u => 2100 + 300 * Math.sin(u * 30 + k), { wave: 'saw', amp: 0.025, a: 0.03, r: 0.3, pan: rnd() }); }
for (const t of [29.5, 29.9]) tone(t, 0.5, 415, { wave: 'sq', amp: 0.035, pan: 0.7 });

// ---- 31-36: cockpit, operating room ----
noise(31, 2.5, { amp: 0.14, lp: 0.03 }); tone(31.15, 0.9, 1318.5, { amp: 0.05, r: 0.7 }); tone(31.45, 1.1, 1046.5, { amp: 0.05, r: 0.9 });
choo(32.2, 0.7, 0.1, 0.45); choo(32.38, 0.5, 0.2, 0.6);
for (let t = 33.55; t < 36; t += 0.83) tone(t, 0.12, 1000, { amp: 0.07, a: 0.002, r: 0.05, pan: 0.35 });
choo(34.7, 0.6, 0.85, 0.55);

// ---- 36-41: the stadium and the decibels ----
noise(36, 5, { amp: 0.2, lp: 0.08, a: 0.5 });
for (let k = 0; k <= 10; k++) tone(38.7 + k * 0.22, 0.1, 400 * Math.pow(1.12, k), { wave: 'tri', amp: 0.035, r: 0.06 });

// ---- WAIT. ----
tone(WAIT0, 2.4, u => 41 * (1 - u * 0.05), { amp: 0.14, a: 0.002, r: 1.8 });
tone(42.5, WAIT1 - 42.5, 55, { amp: 0.05, a: 0.4, r: 0.4 }); tone(42.5, WAIT1 - 42.5, 58.27, { amp: 0.04, a: 0.4, r: 0.4 });

// ---- 44-50: holding it in ----
noise(44, 6, { amp: 0.02, lp: 0.02 });
ah(43.9, 1.1, 0.8); ah(44.9, 0.6, 1.0);
noise(45.6, 0.25, { amp: 0.35, lp: 0.04, decay: 10 }); tone(45.6, 0.5, u => 70 - 30 * u, { amp: 0.12, r: 0.3 });   // the stifled "mmph"
tone(45.8, 4.2, u => 900 + 900 * u / 4.2, { amp: 0.018, a: 1.0, r: 0.4, vib: 0.02, vibF: 7 });                      // pressure
for (let t = 47.15; t < 50; t += 0.5) tone(t, 0.06, 1800, { amp: 0.03, a: 0.001, r: 0.04, pan: 0.6 });            // x-ray scan blips

// ---- 50-56: the payoff ----
{ const mel = [72, 76, 79, 76, 77, 74, 72, 79, 81, 79, 77, 76, 74, 72];
  mel.forEach((m, i) => tone(50.1 + i * 0.28, 0.35, mtof(m), { wave: 'tri', amp: 0.055, a: 0.003, r: 0.3, pan: 0.4 + 0.2 * (i % 2) })); }
for (let k = 0; k < 3; k++) { tone(50.5 + k * 0.35, 0.18, 98, { wave: 'sq', amp: 0.04, r: 0.05 }); }
for (const [t, m] of [[52.0, 84], [52.1, 88], [52.2, 91], [52.3, 96]]) tone(t, 0.7, mtof(m), { amp: 0.06, r: 0.6 });
for (const m of [60, 64, 67, 72]) tone(54, 2.2, mtof(m), { wave: 'tri', amp: 0.02, a: 0.5, r: 0.6 });
ah(53.7, 1.0, 0.7); choo(55.0, 0.9, 0, 0.4);

// ---- end card ----
for (const m of [48, 55, 60, 64]) tone(56, 61 - 56, mtof(m), { wave: 'tri', amp: 0.03, a: 0.8, r: 1.6 });
for (let t = 56.6; t < 59.6; t += 0.6) { kick(t, 0.1); hat(t + 0.3, 0.02); }

for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 2.2) / 2.2; R[i] = Math.tanh(R[i] * 2.2) / 2.2; }
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
fs.mkdirSync(path.join(root, 'tools', 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'out', 'soundtrack.wav'), buf);
console.log(`soundtrack.wav written (gain ${g.toFixed(2)})`);
