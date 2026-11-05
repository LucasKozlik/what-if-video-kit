'use strict';
// =====================================================================
// DIRECTOR — shots, captions, counters, end card.
// Cold open on the aftermath (a silent, brown, fruitless valley) with the
// title over it, then cut back to the living meadow and play the collapse.
// =====================================================================

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const H = (dx, dy, dz) => () => V(WORLD.HERO.x + dx, WORLD.HERO.y + dy, WORLD.HERO.z + dz);
// relative to the hero flower's head (the daisy the close-ups are built around)
const HF = (dx, dy, dz) => () => { const h = flowerHead(WORLD.flowers[0], ECO.flowers, new THREE.Vector3()); return V(h.x + dx, h.y + dy, h.z + dz); };
const T = (x, dy, z) => () => V(x, groundHeightAt(x, z) + dy, z);      // dy above the ground

const SHOTS = [
  // COLD OPEN — two years on. Brown meadow, litter, bare orchard. Title over it.
  { t0: 0, t1: 2.6, p0: T(-4, 1.3, 24), p1: T(-4.5, 1.5, 20), g0: T(-16, 1.6, -22), g1: T(-17, 1.8, -22), f0: 46, f1: 42 },
  // TODAY — the meadow is alive
  { t0: 2.6, t1: 4.5, p0: HF(-0.5, 0.16, 0.66), p1: HF(-0.42, 0.13, 0.55), g0: HF(0, -0.03, 0), g1: HF(0, -0.03, 0), f0: 40, f1: 36 },
  { t0: 4.5, t1: 6.6, p0: T(9, 1.6, 31), p1: T(6, 1.8, 27), g0: T(-6, 3.5, -8), g1: T(-7, 3.0, -10), f0: 48, f1: 46 },
  // THE VANISHING
  { t0: 6.6, t1: 8.8, p0: H(2.2, 0.95, 3.6), p1: H(1.8, 0.9, 3.0), g0: H(0, 0.55, 0), g1: H(0, 0.5, 0), f0: 46, f1: 42 },
  // DAY 1 — still
  { t0: 8.8, t1: 11.6, p0: T(-12, 1.7, 29), p1: T(-10, 1.7, 26), g0: T(0, 2.2, 0), g1: T(1, 2.0, -2), f0: 46, f1: 44 },
  { t0: 11.6, t1: 14.6, p0: HF(-0.5, 0.16, 0.66), p1: HF(-0.4, 0.12, 0.52), g0: HF(0, -0.03, 0), g1: HF(0, -0.04, 0), f0: 40, f1: 36 },
  { t0: 14.6, t1: 17.6, p0: T(14, 0.7, 20), p1: T(11, 0.8, 18), g0: T(0, 0.5, 6), g1: T(-1, 0.5, 5), f0: 44, f1: 42 },
  // THE BIRDS
  { t0: 17.6, t1: 20.6, p0: T(-26, 1.2, -6), p1: T(-27.5, 1.3, -8.5), g0: T(-36, 9, -27), g1: T(-37, 9.5, -28), f0: 50, f1: 48 },
  { t0: 20.6, t1: 23.6, p0: T(-6, 2.0, 2), p1: T(-8, 2.2, 0), g0: T(-34, 7, -26), g1: T(-35, 7, -27), f0: 46, f1: 44 },
  // NOTHING ROTS
  { t0: 23.6, t1: 26.6, p0: T(-12, 1.6, 25), p1: T(-14, 1.5, 27.5), g0: T(-23, 0.5, 37), g1: T(-24, 0.4, 38), f0: 44, f1: 42 },
  { t0: 26.6, t1: 29.6, p0: T(-19.5, 0.65, 31.5), p1: T(-20, 0.6, 32.5), g0: T(-23, 0.05, 36.5), g1: T(-23.4, 0.05, 37), f0: 46, f1: 44 },
  // NEXT SPRING — blossom, no fruit
  { t0: 29.6, t1: 32.6, p0: T(-13, 2.0, -11), p1: T(-15, 2.2, -14), g0: T(-33, 3.2, -30), g1: T(-34, 3.2, -30), f0: 46, f1: 44 },
  { t0: 32.6, t1: 35.6, p0: T(-27.6, 2.3, -15.8), p1: T(-27.2, 2.5, -16.6), g0: T(-24, 3.0, -22), g1: T(-24, 2.9, -22), f0: 46, f1: 42 },
  { t0: 35.6, t1: 38.6, p0: T(-27.8, 1.3, -15.2), p1: T(-27.4, 1.1, -16.4), g0: T(-24.5, 0.4, -21.5), g1: T(-24.5, 0.6, -22), f0: 46, f1: 44 },
  // THE WIND CROPS
  { t0: 38.6, t1: 41.6, p0: T(14, 1.5, -8), p1: T(16, 1.6, -9.5), g0: T(38, 0.8, -30), g1: T(40, 0.8, -31), f0: 46, f1: 44 },
  { t0: 41.6, t1: 44.6, p0: V(2, 38, 22), p1: V(-2, 42, 20), g0: V(30, 0, -26), g1: V(28, 0, -28), f0: 46, f1: 46 },
  // YEAR TWO
  { t0: 44.6, t1: 47.6, p0: HF(-0.5, 0.2, 0.7), p1: HF(-0.4, 0.16, 0.56), g0: HF(0, -0.08, 0), g1: HF(0, -0.08, 0), f0: 42, f1: 38 },
  { t0: 47.6, t1: 50.6, p0: T(22, 6, 42), p1: T(18, 6, 38), g0: T(-8, 1, -12), g1: T(-9, 1, -13), f0: 46, f1: 44 },
  { t0: 50.6, t1: 53.6, p0: T(-4, 1.7, -38), p1: T(-2, 1.7, -41), g0: T(8, 3.5, -62), g1: T(8, 3.5, -62), f0: 46, f1: 42 },
  { t0: 53.6, t1: 61.5, p0: T(0, 4, 14), p1: T(0, 12, 30), g0: T(-4, 0.5, -16), g1: T(-4, 0.5, -18), f0: 46, f1: 48, hand: 0.4 },
];

const CAPTIONS = [
  [2.6, 4.5, 'Right now, about <em>10 quintillion</em> insects are alive.'],
  [4.5, 6.6, "That's over a <em>billion</em> for every human."],
  [6.6, 8.8, 'Now imagine they all <em>vanish.</em> Tonight.'],
  [8.8, 11.6, 'Day 1. The first thing you notice is the <em>silence.</em>'],
  [11.6, 14.6, 'The flowers open&hellip; and <em>wait.</em>'],
  [14.6, 17.6, 'Nearly <em>9 in 10</em> flowering plants need animals to pollinate them.'],
  [17.6, 20.6, 'Almost every songbird feeds its chicks <em>insects.</em>'],
  [20.6, 23.6, 'With nothing to feed them, the nests go <em>quiet.</em>'],
  [23.6, 26.6, 'Nothing breaks down the <em>dung</em> or the dead leaves.'],
  [26.6, 29.6, 'Australia had to import <em>dung beetles</em> &mdash; cow pats sat for months.'],
  [29.6, 32.6, 'Next spring, the orchard <em>blooms.</em>'],
  [32.6, 35.6, 'But no bee ever visits. The blossom just <em>falls.</em>'],
  [35.6, 38.6, 'No apples. No cherries. No <em>chocolate.</em>'],
  [38.6, 41.6, 'Wheat, rice and corn survive &mdash; the <em>wind</em> pollinates them.'],
  [41.6, 44.6, 'But <em>3 in 4</em> of our leading crops depend on pollinators.'],
  [44.6, 47.6, 'Year 2. The wildflowers are almost <em>gone.</em>'],
  [47.6, 50.6, 'Birds, frogs, lizards, fish &mdash; their <em>food</em> is gone.'],
  [50.6, 53.6, 'Biologist E.&thinsp;O. Wilson warned that without insects&hellip;'],
  [53.6, 56.4, '&hellip;humanity probably couldn\'t last <em>more than a few months.</em>'],
];

const DIR = { shot: -1, cap: -1 };
const _cp = new THREE.Vector3(), _cg = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const evalT = g => (typeof g === 'function' ? g() : g);

function updateCamera(t, camera) {
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  const S = SHOTS[i];
  const u = clamp((t - S.t0) / (S.t1 - S.t0), 0, 1);
  const e = easeInOut(u) * 0.35 + u * 0.65;
  _cp.lerpVectors(evalT(S.p0), evalT(S.p1), e);
  _cg.lerpVectors(evalT(S.g0), evalT(S.g1), e);
  _cp.y = Math.max(_cp.y, groundHeightAt(_cp.x, _cp.z) + 0.2);   // standing guard against terrain
  camera.position.copy(_cp);
  camera.lookAt(_cg);
  camera.fov = lerp(S.f0, S.f1, e);
  const hand = 0.005 * (S.hand ?? 1);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(t * 0.35 + 3) * hand;
  _e.x += noise1(t * 0.30 + 9) * hand * 0.7;
  _e.z += noise1(t * 0.25 + 17) * hand * 0.5;
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.userData.target = _cg.clone();
  DIR.shot = i;
}

// 10 quintillion -> 0, over many orders of magnitude, as the vanishing sweeps through.
function insectCount(f) {
  if (f <= 0) return '0';
  const n = 1e19 * Math.pow(f, 10);
  const names = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
  for (const [v, w] of names) if (n >= v) return `${(n / v).toFixed(n / v < 10 ? 1 : 0)} ${w}`;
  return Math.round(n).toLocaleString('en-US');
}

function updateHUD(t, el) {
  el.hook.classList.toggle('on', t < COLD);
  // the hook pops in as a pure function of film time (no CSS transitions in export)
  const ha = t < COLD ? clamp(t / 0.35, 0, 1) * (1 - smooth(COLD - 0.25, COLD, t)) : 0;
  el.hook.style.opacity = ha.toFixed(3);
  el.hook.style.transform = `scale(${(0.92 + 0.08 * Math.min(1, ha * 1.2)).toFixed(3)})`;
  const ca = smooth(COLD, COLD + 0.4, t) * (1 - smooth(56, 56.5, t));
  el.counters.style.opacity = ca.toFixed(3);
  document.getElementById('shade').style.opacity = ca.toFixed(3);

  const ci = CAPTIONS.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== DIR.cap) {
    DIR.cap = ci;
    if (ci < 0) el.caption.innerHTML = '';
    else {
      const div = document.createElement('div'); div.innerHTML = CAPTIONS[ci][2];
      const words = CAPTIONS[ci][2]
        .replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' '))
        .split(' ');
      el.caption.innerHTML = '<div class="cap">' + words.map(w =>
        `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ') + '</div>';
    }
    el.capSpans = el.caption.querySelectorAll('span');
  }
  if (ci >= 0 && el.capSpans) {
    const t0 = CAPTIONS[ci][0], t1 = CAPTIONS[ci][1];
    const out = 1 - smooth(t1 - 0.2, t1, t);
    el.capSpans.forEach((sp, k) => {
      const a = clamp((t - t0 - k * 0.06) / 0.26, 0, 1);
      const e = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.6) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.2).toFixed(3)}cqw) scale(${(0.8 + 0.2 * e).toFixed(3)})`;
    });
  }

  // counters — all read from the simulation state
  const vanished = ECO.s >= VANISH0;
  el.day.textContent = !vanished ? '0' : Math.floor(ECO.day).toLocaleString('en-US');
  el.dayLbl.textContent = Math.floor(ECO.day) === 1 ? 'DAY WITHOUT INSECTS' : 'DAYS WITHOUT INSECTS';
  el.ins.textContent = insectCount(ECO.insects);
  el.insBox.classList.toggle('hot', ECO.insects < 1);
  el.birds.textContent = `${Math.round(ECO.birds * 100)}%`;
  el.flw.textContent = `${Math.round(ECO.flowers * 100)}%`;

  const ea = smooth(56, 56.7, t);
  el.end.style.opacity = ea.toFixed(3);
  el.end.style.visibility = ea > 0.001 ? 'visible' : 'hidden';
}
