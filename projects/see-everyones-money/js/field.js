'use strict';
// =====================================================================
// THE FIELD — for this piece it is not a force but a REVEAL.
//
// One expanding wavefront, centred on the first person whose number appears,
// decides when every other number switches on. The glowing ring drawn on the
// pavement (world.js) and the label pop (labels.js) both read revealR() from
// here, so the ring visibly *is* the thing turning the numbers on.
//
// Every actor's position is a pure function of story time, so ?shot= seeking
// is exact and the cold open can simply borrow a later moment.
// =====================================================================

// ---- film time -> story time -------------------------------------------
// The cold open (0..2.6 s) is a flash-forward to the billionaire beat.
const COLD_OPEN = 2.6;
const storyT = t => (t < COLD_OPEN ? 39.4 + t : t);

// ---- the reveal wave ---------------------------------------------------
const REVEAL = { t0: 10.2, firstT: 6.9 };
function revealR(st) {                   // metres from the origin person; must match ring shader
  const u = st - REVEAL.t0;
  return u <= 0 ? 0 : 5.5 * u + 9 * u * u;
}

// ---- the billionaire beat ----------------------------------------------
const BILL = {
  value: 3.4e9,
  carStop: 33.6,                        // story time the car stops at the curb
  stepOut: 34.4, atCurb: 36.4,          // walks from the car door to the sidewalk
  revealT: 35.0, countDur: 2.6,
  stop: { x: 2.0, z: 5.6 },
  stand: { x: 2.3, z: 9.0 },
};
// Attention: everyone slows, stops and turns toward him.
const ATTN = { t0: 41.6, t1: 44.0 };
const attnAt = (st, delay = 0) => smooth(ATTN.t0 + delay, ATTN.t1 + delay, st);

function billCarX(st) {                  // decelerates to a stop at stop.x by carStop
  const dur = 7.0, v0 = 13;
  const u = clamp((st - (BILL.carStop - dur)) / dur, 0, 1);
  // position from a linearly decaying speed: x = x0 + v0*dur*(u - u^2/2)
  const x0 = BILL.stop.x - v0 * dur * 0.5;
  if (st < BILL.carStop - dur) return x0 - v0 * (BILL.carStop - dur - st);
  return x0 + v0 * dur * (u - u * u / 2);
}

// ---- integrated walking progress (slows to a stop under attention) -------
// G(st) = ∫ (1 - 0.97*attn) dτ, tabulated so positions stay pure functions of time.
const G_TAB = (() => {
  const n = 64 * 120, a = new Float32Array(n + 1); let s = 0;
  for (let i = 1; i <= n; i++) { const tau = (i - 0.5) / 120; s += (1 - 0.97 * attnAt(tau)) / 120; a[i] = s; }
  return a;
})();
function walkG(st) {
  if (st <= 0) return st;
  const f = st * 120, i = Math.floor(f);
  if (i >= G_TAB.length - 1) return G_TAB[G_TAB.length - 1] + (st - (G_TAB.length - 1) / 120) * 0.03;
  return lerp(G_TAB[i], G_TAB[i + 1], f - i);
}

// ---- net worth -----------------------------------------------------------
// A crowd shaped like U.S. family net worth (Federal Reserve SCF 2022:
// median $192,900, mean $1,063,700). Quantiles interpolated in asinh space.
const NW_Q = [
  [0.00, -160000], [0.04, -38000], [0.09, -2000], [0.11, 1500], [0.25, 27000],
  [0.40, 105000], [0.50, 193000], [0.60, 305000], [0.75, 660000], [0.90, 1900000],
  [0.95, 3700000], [0.985, 11000000], [1.0, 26000000],
];
function nwQuantile(p) {
  let i = 0; while (i < NW_Q.length - 2 && p > NW_Q[i + 1][0]) i++;
  const [p0, v0] = NW_Q[i], [p1, v1] = NW_Q[i + 1];
  const k = 1 / 20000, f = clamp((p - p0) / (p1 - p0), 0, 1);
  return Math.sinh(lerp(Math.asinh(v0 * k), Math.asinh(v1 * k), f)) / k;
}
function niceRound(v) {
  const a = Math.abs(v), q = a < 10000 ? 10 : a < 1e5 ? 10 : a < 1e6 ? 100 : 10000;
  return Math.round(v / q) * q;
}

// ---- the cast --------------------------------------------------------------
// Avenue runs along X. Road z in [-7,7]; sidewalks z in ±[7,12.5].
// Cross street x in [-6,6]. Crosswalk across the avenue at x in [-11,-8].
const PEOPLE = [];
const PRNG = mulberry32(424242);
const SKIN = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8714a', '#8a5636', '#5f3a24', '#f5d6bd', '#d29a72'];
const HAIR = ['#1d1612', '#2e2018', '#4a3020', '#6b4a2c', '#a07a4a', '#cfb07a', '#8a8a8a', '#d8d4cc', '#5a1e14'];
const TOPS = ['#2b3a55', '#7a2630', '#d9d4c7', '#3f5f45', '#c9a04a', '#5a5f66', '#1f1f22', '#a85a32',
              '#6c7fa6', '#e6e2da', '#843e6a', '#2f6f7a', '#b8b0a0', '#3a2f2a', '#c45a4a', '#4c5a8a'];
const BOTTOMS = ['#22262e', '#2f3a4d', '#4a4a4a', '#6b5a44', '#1a1a1a', '#3d4a5a', '#8a7a62', '#2a2a30'];

function makePerson(o) {
  const p = Object.assign({
    kind: 'walk', h: rr(1.62, 1.9, PRNG), w: rr(0.92, 1.12, PRNG),
    skin: rpick(SKIN, PRNG), hair: rpick(HAIR, PRNG), top: rpick(TOPS, PRNG), bottom: rpick(BOTTOMS, PRNG),
    long: PRNG() < 0.35, coat: PRNG() < 0.3, phase: PRNG() * 10, delay: 0, value: 0, revealT: Infinity,
    pos: { x: 0, z: 0 }, yaw: 0, gait: 0, moving: 1,
  }, o);
  p.id = PEOPLE.length; PEOPLE.push(p); return p;
}

const XMIN = -75, XMAX = 75, XSPAN = XMAX - XMIN;
const wrapX = x => XMIN + (((x - XMIN) % XSPAN) + XSPAN) % XSPAN;

// sidewalk walkers
const LANES = [
  { z: 8.4, dir: 1 }, { z: 9.5, dir: -1 }, { z: 10.6, dir: 1 }, { z: 11.6, dir: -1 },
  { z: -8.4, dir: -1 }, { z: -9.5, dir: 1 }, { z: -10.6, dir: -1 }, { z: -11.6, dir: 1 },
];
for (let i = 0; i < 150; i++) {
  const L = LANES[i % LANES.length];
  makePerson({ kind: 'walk', lane: L, z0: L.z + rr(-0.25, 0.25, PRNG), x0: rr(XMIN, XMAX, PRNG),
               speed: rr(1.15, 1.55, PRNG) });
}
// crosswalk crowds, waiting on each corner then crossing in waves
for (let i = 0; i < 30; i++) {
  const north = i % 2 === 0;
  makePerson({ kind: 'cross', north, cx: rr(-10.8, -8.2, PRNG), wait: rr(0.4, 1.0, PRNG),
               queue: rr(0, 1.4, PRNG), speed: rr(1.25, 1.55, PRNG) });
}

// named characters -----------------------------------------------------------
const HER = makePerson({ kind: 'path', name: 'her', top: '#c9573f', bottom: '#2a2f3a', long: true, hair: '#3a2418',
  h: 1.68, coat: true, path: st => ({ x: -33 + 1.22 * walkG(st), z: 9.0 }), value: 58300, revealT: REVEAL.firstT });
const STUDENT = makePerson({ kind: 'path', name: 'student', top: '#6b7a3a', bottom: '#2f3a4d', long: false,
  hair: '#1d1612', h: 1.8, path: st => ({ x: -2 - 1.3 * walkG(st), z: -9.0 }), value: -41920 });
const SUIT = makePerson({ kind: 'path', name: 'suit', top: '#1c1d22', bottom: '#1c1d22', suit: true, long: false,
  hair: '#2e2018', h: 1.84, path: st => ({ x: -60 + 1.45 * walkG(st), z: 10.2 }), value: -8450 });
const GRAN = makePerson({ kind: 'path', name: 'gran', top: '#8a8272', bottom: '#5a5248', coat: true, long: true,
  hair: '#d8d4cc', h: 1.6, path: st => ({ x: -19.6, z: 11.4 }), standYaw: Math.PI * 0.95, value: 1240000 });
const BILLIONAIRE = makePerson({ kind: 'bill', name: 'bill', top: '#141a2a', bottom: '#141a2a', suit: true,
  long: false, hair: '#6b6460', h: 1.8, value: BILL.value, revealT: BILL.revealT });

// assign generic net worth by rank so the crowd has the SCF shape
(() => {
  const generic = PEOPLE.filter(p => !p.name);
  const ranks = generic.map((p, i) => i).sort(() => 0);   // stable order, then shuffle deterministically
  for (let i = ranks.length - 1; i > 0; i--) { const j = Math.floor(PRNG() * (i + 1)); [ranks[i], ranks[j]] = [ranks[j], ranks[i]]; }
  generic.forEach((p, i) => { p.value = niceRound(nwQuantile((ranks[i] + 0.5) / generic.length)); });
})();

// ---- positions as pure functions of story time -----------------------------
function crossState(p, st) {
  // two crossing waves: crowd steps off the curb at 10.4 and 38.0
  const starts = [10.4, 38.0];
  let s0 = -1e9; for (const s of starts) if (st >= s + p.wait) s0 = s + p.wait;
  const zFrom = p.north ? 8.6 + p.queue * 0.9 : -8.6 - p.queue * 0.9;
  const dir = p.north ? -1 : 1;
  const len = 17.2 + p.queue * 1.8;
  let prog = 0, moving = 0;
  if (s0 > -1e8) {
    prog = p.speed * (walkG(st) - walkG(s0));
    if (prog >= len) {           // arrived: they are now on the other corner, waiting there
      prog = len;
    } else moving = 1 - attnAt(st, p.delay) * 0.97;
  }
  const done = Math.floor(starts.filter(s => st >= s + p.wait + len / p.speed + 3).length);
  const side = (done % 2 === 0) ? 1 : -1;            // after each completed crossing they swap corners
  const zStart = side > 0 ? zFrom : -zFrom;
  const d = side > 0 ? dir : -dir;
  return { x: p.cx + Math.sin(p.phase * 3 + prog * 0.3) * 0.15, z: zStart + d * prog, yaw: d > 0 ? 0 : Math.PI, moving };
}

const _pp = { x: 0, z: 0 };
function personAt(p, st) {
  let x, z, yaw, moving = 1, gaitDist;
  if (p.kind === 'walk') {
    const g = walkG(st);
    gaitDist = p.speed * g;
    x = wrapX(p.x0 + p.lane.dir * gaitDist);
    z = p.z0 + Math.sin(p.phase + x * 0.05) * 0.18;
    yaw = p.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    moving = 1 - attnAt(st, p.delay) * 0.97;
  } else if (p.kind === 'cross') {
    const c = crossState(p, st);
    x = c.x; z = c.z; yaw = c.yaw; moving = c.moving;
    gaitDist = p.speed * walkG(st);
  } else if (p.kind === 'path') {
    const a = p.path(st), b = p.path(st + 0.05);
    x = a.x; z = a.z;
    const dx = b.x - a.x, dz = b.z - a.z, sp = Math.hypot(dx, dz) / 0.05;
    yaw = sp > 0.05 ? Math.atan2(dx, dz) : (p.standYaw ?? 0);
    moving = clamp(sp / 1.2, 0, 1);
    gaitDist = walkG(st) * 1.3;
  } else {                                         // the billionaire
    const u = smooth(BILL.stepOut, BILL.atCurb, st);
    x = lerp(BILL.stop.x + 0.3, BILL.stand.x, u);
    z = lerp(BILL.stop.z + 1.25, BILL.stand.z, u);
    const walking = st > BILL.stepOut && st < BILL.atCurb;
    moving = walking ? 0.8 : 0;
    yaw = walking ? 0 : lerp(0, -2.5, smooth(BILL.atCurb, BILL.atCurb + 1.5, st));
    gaitDist = (st - BILL.stepOut) * 1.1;
  }
  p.pos.x = x; p.pos.z = z; p.moving = moving; p.gait = gaitDist * 2.1 + p.phase;
  // turn toward him under attention
  if (p !== BILLIONAIRE && st > ATTN.t0) {
    const a = attnAt(st, p.delay);
    const ty = Math.atan2(BILL.stand.x - x, BILL.stand.z - z);
    let d = ty - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    yaw += d * a;
  }
  p.yaw = yaw;
  return p.pos;
}
function visibleNow(p, st) {
  if (p === BILLIONAIRE) return st >= BILL.stepOut;
  return true;
}

// reveal times: first stored crossing of the wavefront, found by scanning story time
(() => {
  const o = personAt(HER, REVEAL.firstT);
  REVEAL.ox = o.x; REVEAL.oz = o.z;
  for (const p of PEOPLE) {
    if (p.revealT < Infinity) continue;
    for (let st = REVEAL.t0; st < 30; st += 1 / 30) {
      const q = personAt(p, st);
      if (Math.hypot(q.x - REVEAL.ox, q.z - REVEAL.oz) < revealR(st)) { p.revealT = st; break; }
    }
  }
  // attention delay grows with distance from him: the stare ripples outward
  for (const p of PEOPLE) {
    const q = personAt(p, ATTN.t0);
    p.delay = Math.hypot(q.x - BILL.stand.x, q.z - BILL.stand.z) / 26 + PRNG() * 0.5;
  }
})();

// ---- stats the HUD reads -----------------------------------------------------
const FIELD = { st: 0, revealed: 0, median: 0, mean: 0 };
function shownValue(p, st) {           // the number counts up after the reveal
  if (st < p.revealT) return null;
  const dur = p === BILLIONAIRE ? BILL.countDur : 0.75;
  const u = clamp((st - p.revealT) / dur, 0, 1);
  const e = p === BILLIONAIRE ? Math.pow(u, 2.2) : 1 - Math.pow(1 - u, 3);
  return p.value * e;
}
function updateField(t) {
  const st = storyT(t);
  FIELD.st = st;
  const vals = [];
  for (const p of PEOPLE) {
    if (!visibleNow(p, st)) continue;
    const v = shownValue(p, st);
    if (v != null && st >= p.revealT + 0.75 * (p === BILLIONAIRE ? 0 : 1)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  FIELD.revealed = vals.length;
  FIELD.median = vals.length ? (vals.length % 2 ? vals[(vals.length - 1) / 2]
    : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2) : 0;
  FIELD.mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
// The final figures the captions quote — computed, not typed in.
const FINAL = (() => {
  const all = PEOPLE.filter(p => p !== BILLIONAIRE).map(p => p.value).sort((a, b) => a - b);
  const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  const withB = [...all, BILL.value].sort((a, b) => a - b);
  return { n: all.length, median: med(all), mean: all.reduce((a, b) => a + b, 0) / all.length,
           medianB: med(withB), meanB: withB.reduce((a, b) => a + b, 0) / withB.length };
})();
