'use strict';
// =====================================================================
// CUES — the single timeline both the picture (story.js / director) and
// the soundtrack (tools/audio.mjs) read. No dependencies, so Node can
// evaluate it too. Change a time here and the sound follows the picture.
// =====================================================================

const DURATION = 61;
const COLD_OPEN = 2.2;           // 0..2.2 s: Day 10 at the pool under the title
const END_T = 55.0;              // end card from here to DURATION
const DAY_T = d => (d === 10 ? 47.2 : 2.2 + (d - 1) * 5);
// how long into each day the nose "sproings" to its new length
const GROW_AT = [0, 2.6, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.6, 0.45, 0.5];
const LEN = d => (d <= 0 ? 0.046 : 0.0504 * Math.pow(1.8, d - 1));   // 5.0 cm -> 10.0 m

function dayAt(t) {
  if (t < COLD_OPEN) return 10;
  let d = 1;
  for (let k = 2; k <= 10; k++) if (t >= DAY_T(k)) d = k;
  return d;
}
function growK(x) { return x <= 0 ? 0 : 1 - Math.exp(-x * 6.5) * Math.cos(x * 17); }
function noseLen(t) {
  if (t < COLD_OPEN) return LEN(10);
  const d = dayAt(t);
  const x = t - DAY_T(d) - GROW_AT[d];
  return LEN(d - 1) + (LEN(d) - LEN(d - 1)) * growK(x);
}

// Named story beats (seconds of film time). Picture and sound both use these.
const T = {
  squint: 4.0, touch: 5.0,
  cupUp: 8.6, plip: 9.55, foam: 10.2, eStare: 10.6,
  kidsLaugh: 12.9, glassesOn: 14.6, miaFloor: 15.8,
  boop: 18.25, mwah: 19.95, tapeOut: 20.9,
  frameKnock: 24.05, tiptoe: 25.0,
  noseDown: 28.4, napkin: 30.15,
  ting: 34.45, crystal0: 34.7,
  snore0: 37.4,
  slideLeo: 42.9, plopLeo: 44.15, slideMia: 44.55, plopMia: 45.55,
  tipLand: 47.8,
};

// Crystals knocked off the chandelier: [crystal index, fall time].
const CRYSTAL_FALLS = [[3, 34.62], [26, 34.78], [5, 34.95], [48, 35.1], [28, 35.32], [70, 35.5], [9, 35.75]];
const CRYSTAL_LAND = 0.85;   // seconds from release to the floor (story.js solves g so they land exactly then)

const CAPTIONS = [
  [2.2, 4.6, 'It starts with a <em>mirror</em>.'],
  [4.6, 7.2, 'He decides it’s <em>nothing</em>.'],
  [7.2, 9.6, 'His wife <em>notices</em>.'],
  [9.6, 12.2, 'So does the <em>espresso</em>.'],
  [12.2, 14.6, 'The kids <em>love it</em>.'],
  [14.6, 17.2, 'Sunglasses: <em>retired</em>.'],
  [17.2, 19.6, 'Kisses now come <em>from the side</em>.'],
  [19.6, 22.2, 'Leo is keeping <em>records</em>.'],
  [22.2, 24.6, 'Doors become a <em>problem</em>.'],
  [24.6, 27.2, 'He goes <em>nose-first</em> now.'],
  [27.2, 29.6, 'He acts <em>completely normal</em>.'],
  [29.6, 32.2, 'Mia finds a <em>napkin hook</em>.'],
  [32.2, 34.6, 'The stairs were <em>not built</em> for this.'],
  [34.6, 37.2, 'Neither was the <em>chandelier</em>.'],
  [37.2, 39.6, 'It sleeps <em>outside</em> now.'],
  [39.6, 42.2, 'She bought it a <em>pillow</em>.'],
  [42.2, 44.6, 'The family <em>adapts</em>.'],
  [44.6, 47.2, 'It’s a <em>slide</em> now.'],
  [47.2, 49.6, 'Day 10. <em>Ten metres</em>.'],
  [49.6, 52.2, 'Best seat in the <em>house</em>.'],
  [52.2, 55.0, 'Still <em>their dad</em>.'],
];

// Sound cues. type -> synth in tools/audio.mjs
function buildCues() {
  const c = [];
  for (let d = 1; d <= 10; d++) c.push({ t: DAY_T(d), k: 'cut', d });
  for (let d = 2; d <= 10; d++) c.push({ t: DAY_T(d) + GROW_AT[d], k: 'boing', d });
  c.push({ t: DAY_T(1) + GROW_AT[1], k: 'boingTiny', d: 1 });
  c.push({ t: 0.05, k: 'titleHit' });
  c.push({ t: T.touch, k: 'boop', p: 1.5 });
  c.push({ t: T.plip, k: 'plip' }, { t: T.plip + 0.25, k: 'slurp' });
  c.push({ t: T.kidsLaugh, k: 'giggle', n: 10, p: 1.25 }, { t: T.kidsLaugh + 0.3, k: 'giggle', n: 9, p: 1.45 });
  c.push({ t: T.glassesOn, k: 'click' });
  c.push({ t: T.miaFloor, k: 'giggle', n: 12, p: 1.5 }, { t: T.miaFloor + 0.15, k: 'giggle', n: 10, p: 1.25 }, { t: T.miaFloor, k: 'thud', v: 0.4 });
  c.push({ t: T.boop, k: 'boop', p: 1 }, { t: T.mwah, k: 'mwah' });
  c.push({ t: T.tapeOut, k: 'zip' });
  c.push({ t: T.frameKnock, k: 'clack' }, { t: T.frameKnock + 0.05, k: 'creak' });
  c.push({ t: T.noseDown, k: 'thunk' }, { t: T.napkin - 0.35, k: 'whoosh' }, { t: T.napkin + 0.25, k: 'giggle', n: 7, p: 1.5 });
  c.push({ t: T.ting, k: 'ting' });
  for (const [, ft] of CRYSTAL_FALLS) c.push({ t: ft, k: 'ting', v: 0.5 }, { t: ft + CRYSTAL_LAND, k: 'tink' });
  for (let i = 0; i < 4; i++) c.push({ t: T.snore0 + i * 1.25, k: 'snore' });
  c.push({ t: T.slideLeo, k: 'slide' }, { t: T.plopLeo, k: 'plop' }, { t: T.slideMia, k: 'slide', p: 1.2 }, { t: T.plopMia, k: 'plop', p: 1.2 });
  c.push({ t: T.slideLeo + 0.1, k: 'giggle', n: 8, p: 1.3 }, { t: T.slideMia + 0.1, k: 'giggle', n: 8, p: 1.55 });
  c.push({ t: T.tipLand, k: 'thump' });
  c.push({ t: 49.4, k: 'giggle', n: 6, p: 1.4 });
  c.push({ t: END_T, k: 'endChord' });
  return c.sort((a, b) => a.t - b.t);
}
const CUES = buildCues();

if (typeof module !== 'undefined') module.exports = { DURATION, COLD_OPEN, END_T, DAY_T, GROW_AT, LEN, dayAt, noseLen, T, CRYSTAL_FALLS, CRYSTAL_LAND, CAPTIONS, CUES };
