'use strict';
// =====================================================================
// CUES — one timeline for picture and sound. No dependencies (Node reads it too).
// "What if you could see how much money everyone has?"
// =====================================================================

const DURATION = 61;
const COLD_OPEN = 2.2;
const END_T = 55.0;

// scene list: [name, set, start]
const SCENES = [
  ['open', 'street', 0],
  ['wake', 'bath', 2.2],
  ['cafe', 'open', 8.2],
  ['street', 'street', 15.2],
  ['date', 'dining', 22.2],
  ['grandma', 'living', 29.2],
  ['billionaire', 'street', 35.2],
  ['payday', 'kitchen', 42.4],
  ['party', 'pool', 48.0],
];
function sceneAt(t) { let s = SCENES[0]; for (const x of SCENES) if (t >= x[2]) s = x; return s; }
function sceneStart(name) { return SCENES.find(s => s[0] === name)[2]; }

const T = {
  tagsAppear: 3.0, swat: 5.6,
  coffee: 9.6, suitReveal: 10.9, hoodieReveal: 13.2,
  carReveal: 17.6, hotdog: 16.4, dogReveal: 19.0, bark: 19.5,
  gulp: 23.4, bill: 25.2, priyaPays: 26.5, tip: 28.2,
  jawDrop: 30.0,
  billionaireIn: 35.6, gasp: 36.3, ticking: 37.6,
  payday: 43.3, rent: 45.6,
  fadeTags: 51.6,
};

// Sam's balance: [time, delta]
const SAM_TX = [[T.coffee, -6.5], [T.hotdog, -4.0], [T.tip, -12.0], [T.payday, 2150.0], [T.rent, -1600.0]];
const SAM_START = 1240.18;
function samBalance(t) {
  let v = SAM_START;
  for (const [t0, d] of SAM_TX) { const k = Math.min(1, Math.max(0, (t - t0) / 0.7)); v += d * (1 - Math.pow(1 - k, 3)); }
  return v;
}
// the most recent transaction, for the "-$6.50" flash
function samLastTx(t) { let r = null; for (const [t0, d] of SAM_TX) if (t >= t0 && t < t0 + 1.6) r = { d, age: t - t0 }; return r; }

const BILLIONAIRE_0 = 186300000000, BILLIONAIRE_RATE = 634;   // dollars per second, illustrative
const billionaireValue = t => BILLIONAIRE_0 + Math.max(0, t - T.billionaireIn) * BILLIONAIRE_RATE * (t > T.ticking ? 1 : 0.3);

const CAPTIONS = [
  [2.2, 5.0, 'One morning, <em>numbers</em> appear.'],
  [5.0, 8.2, 'Yours says <em>$1,240</em>.'],
  [8.2, 10.6, 'Everyone has <em>one</em>.'],
  [10.6, 12.9, 'The suit is <em>in debt</em>.'],
  [12.9, 15.2, 'The hoodie is a <em>millionaire</em>.'],
  [15.2, 18.6, 'The sports car is <em>borrowed</em>.'],
  [18.6, 22.2, 'The dog has <em>nothing</em>. Best day ever.'],
  [22.2, 25.6, 'First dates get <em>awkward</em>.'],
  [25.6, 29.2, 'She’s <em>got this</em>.'],
  [29.2, 32.2, 'Grandma never <em>mentioned</em> this.'],
  [32.2, 35.2, 'She just keeps <em>knitting</em>.'],
  [35.2, 38.6, 'Then a <em>billionaire</em> walks past.'],
  [38.6, 42.4, 'His number goes up <em>while you watch</em>.'],
  [42.4, 45.2, '<em>Payday!</em>'],
  [45.2, 48.0, 'Rent day. <em>Same day</em>.'],
  [48.0, 51.5, 'Everyone has a <em>number</em>.'],
  [51.5, 55.0, 'Nobody here is <em>counting</em>.'],
];

function buildCues() {
  const c = [];
  for (const [n, , t] of SCENES) if (t > 0) c.push({ t, k: 'cut' });
  c.push({ t: 0.05, k: 'titleHit' });
  c.push({ t: T.tagsAppear, k: 'sparkle' }, { t: T.tagsAppear + 0.6, k: 'boop', p: 0.8 });
  c.push({ t: T.swat, k: 'whoosh' }, { t: T.swat + 0.15, k: 'boing', f: 300 });
  c.push({ t: T.coffee, k: 'kaching', v: 0.6 });
  c.push({ t: T.suitReveal, k: 'wahwah' });
  c.push({ t: T.hoodieReveal, k: 'sparkle' }, { t: T.hoodieReveal + 0.1, k: 'ooh' });
  c.push({ t: T.hotdog, k: 'coin' });
  c.push({ t: T.carReveal, k: 'wahwah', p: 0.9 });
  c.push({ t: T.dogReveal, k: 'boop', p: 1.2 }, { t: T.bark, k: 'bark' }, { t: T.bark + 0.35, k: 'bark', p: 1.1 }, { t: 21.0, k: 'bark', p: 1.05 });
  c.push({ t: T.gulp, k: 'gulp' }, { t: T.bill, k: 'thud', v: 0.35 }, { t: T.priyaPays, k: 'kaching', v: 0.8 }, { t: T.tip, k: 'coin' });
  c.push({ t: T.jawDrop, k: 'scratch' }, { t: T.jawDrop + 0.3, k: 'sparkle' }, { t: 33.6, k: 'giggle', n: 4, p: 0.9 });
  c.push({ t: T.billionaireIn, k: 'sparkle' }, { t: T.gasp, k: 'gasp' });
  for (let x = T.billionaireIn + 0.2; x < 42.3; x += 0.09) c.push({ t: x, k: 'tick', v: x > T.ticking ? 1 : 0.4 });
  c.push({ t: T.payday, k: 'kaching', v: 1 }, { t: T.payday + 0.35, k: 'fanfare' });
  c.push({ t: T.rent, k: 'wahwah', p: 0.8 });
  c.push({ t: 48.6, k: 'giggle', n: 8, p: 1.0 }, { t: 49.4, k: 'giggle', n: 7, p: 1.4 }, { t: 50.4, k: 'bark', p: 1.1 }, { t: 51.0, k: 'giggle', n: 9, p: 1.2 });
  for (let i = 0; i < 6; i++) c.push({ t: T.fadeTags + i * 0.35, k: 'pop', p: 1 + i * 0.12 });
  c.push({ t: END_T, k: 'endChord' });
  return c.sort((a, b) => a.t - b.t);
}
const CUES = buildCues();

if (typeof module !== 'undefined') module.exports = { DURATION, COLD_OPEN, END_T, SCENES, sceneAt, sceneStart, T, SAM_TX, SAM_START, samBalance, samLastTx, billionaireValue, CAPTIONS, CUES };
