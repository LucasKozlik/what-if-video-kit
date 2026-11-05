'use strict';
// =====================================================================
// DIRECTOR — shots, captions, counters, overlays.
// Attention structure: cold open on the climax + an open loop ("one of these
// myths is true"), a cut every 2-3 s, an early myth-bust, hyper-specific
// numbers, a hard pattern interrupt (silence + grey), one hero (Sam) we keep
// coming back to, the loop paid off at ~52 s, and a comment question.
// =====================================================================

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _hw = new THREE.Vector3();
// A point in front of / beside cast member i's head: f = forward, r = right, u = up (metres)
const HF = (i, f, r, u) => () => {
  const p = PEOPLE.cast[i]; headWorld(p, SN.s, SN.t, _hw);
  const yaw = (setOrigin(p).yaw || 0) + p.face;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);           // forward
  return V(_hw.x + fx * f - fz * r, _hw.y + u, _hw.z + fz * f + fx * r);
};
const ST = (dx, y, dz) => V(STADIUM.c.x + dx, y, STADIUM.c.z + dz);
const CAR = (dx, dy, dz) => () => { const c = WORLD.hw[0], s = hwState(c, SN.t); return V(s.x + dx, dy, s.z + dz); };
const CK = (x, y, z) => V(SETS.cockpit.x + x, SETS.cockpit.y + y, SETS.cockpit.z + z);
const ORr = (x, y, z) => V(SETS.or.x + x, SETS.or.y + y, SETS.or.z + z);
const BD = (x, y, z) => V(SETS.bed.x + x, SETS.bed.y + y, SETS.bed.z + z);

const SHOTS = [
  // COLD OPEN — a packed stadium mid-CHOO, the mist hanging in the sun
  { t0: 0, t1: 2.5, p0: ST(43.6, 2.9, 24.6), p1: ST(44.6, 3.0, 25.4), g0: ST(50.4, 4.6, 30.4), g1: ST(50.6, 4.7, 30.6), f0: 44, f1: 40 },
  // 11:59:57 — the sidewalk
  { t0: 2.5, t1: 4.3, p0: V(-16, 1.7, -5.2), p1: V(-15, 1.7, -5.4), g0: V(-5.4, 1.5, -9.3), g1: V(-5.4, 1.5, -9.3), f0: 40, f1: 38, punch: 1 },
  { t0: 4.3, t1: 6.0, p0: HF(0, 1.6, 0.5, -0.05), p1: HF(0, 1.35, 0.4, -0.05), g0: HF(0, 0, 0, -0.12), g1: HF(0, 0, 0, -0.1), f0: 38, f1: 36 },
  // ah... ah...
  { t0: 6.0, t1: 8.0, p0: HF(0, 1.0, 0.12, -0.02), p1: HF(0, 0.85, 0.1, -0.02), g0: HF(0, 0, 0, -0.06), g1: HF(0, 0, 0, -0.05), f0: 36, f1: 32 },
  { t0: 8.0, t1: 9.3, p0: HF(1, 0.7, -0.2, 0.0), p1: HF(1, 0.62, -0.15, 0.0), g0: HF(1, 0, 0, 0), g1: HF(1, 0, 0, 0), f0: 36, f1: 34, punch: 1 },
  { t0: 9.3, t1: 10.6, p0: HF(0, 0.42, 0.04, 0.03), p1: HF(0, 0.34, 0.03, 0.03), g0: HF(0, 0, 0, 0.03), g1: HF(0, 0, 0, 0.03), f0: 30, f1: 26, punch: 1 },
  // CHOO
  { t0: 10.6, t1: 13.0, p0: HF(0, 1.2, -0.75, -0.05), p1: HF(0, 1.6, -0.95, 0.0), g0: HF(0, 0.15, 0, -0.12), g1: HF(0, 0.35, 0, -0.2), f0: 36, f1: 46, punch: 2 },
  // myth-buster replay, slow motion
  { t0: 13.0, t1: 16.0, p0: HF(0, 0.5, -1.3, -0.02), p1: HF(0, 0.5, -1.15, -0.02), g0: HF(0, 0.25, 0, -0.08), g1: HF(0, 0.28, 0, -0.08), f0: 40, f1: 36 },
  { t0: 16.0, t1: 19.0, p0: HF(0, 1.3, -0.9, 0.1), p1: HF(0, 1.2, -0.8, 0.08), g0: HF(0, 0.3, 0, -0.1), g1: HF(0, 0.3, 0, -0.1), f0: 38, f1: 36 },
  // the cloud, side-on, with a tape measure
  { t0: 19.0, t1: 22.0, p0: HF(0, -2.4, -1.5, 2.4), p1: HF(0, -2.2, -1.3, 2.6), g0: HF(0, 3.8, 0, -1.3), g1: HF(0, 3.9, 0, -1.3), f0: 52, f1: 52 },
  { t0: 22.0, t1: 25.0, p0: HF(0, 9.8, -1.6, 0.0), p1: HF(0, 9.4, -1.5, 0.1), g0: HF(0, 2.5, 0, -0.5), g1: HF(0, 2.5, 0, -0.5), f0: 48, f1: 46 },
  // the highway
  { t0: 25.0, t1: 28.0, p0: CAR(-30, 20, 26), p1: CAR(-22, 16, 22), g0: CAR(6, 0, 0), g1: CAR(6, 0, 0), f0: 44, f1: 44 },
  { t0: 28.0, t1: 31.0, p0: CAR(0.15, 1.18, -0.36), p1: CAR(0.15, 1.18, -0.36), g0: CAR(30, 0.9, -0.36), g1: CAR(30, 0.9, -0.36), f0: 58, f1: 58, hand: 0.3 },
  // the cockpit, the operating room
  { t0: 31.0, t1: 32.0, p0: CK(-2.6, 1.55, 0.0), p1: CK(-2.4, 1.5, 0.0), g0: CK(1.8, 1.2, 0), g1: CK(1.8, 1.2, 0), f0: 52, f1: 50 },
  { t0: 32.0, t1: 33.5, p0: HF(4, 0.8, -0.35, 0.02), p1: HF(4, 0.7, -0.3, 0.02), g0: HF(4, 0, 0, -0.05), g1: HF(4, 0, 0, -0.05), f0: 40, f1: 36, punch: 1 },
  { t0: 33.5, t1: 36.0, p0: ORr(2.6, 1.85, 2.4), p1: ORr(2.4, 1.8, 2.2), g0: ORr(0.3, 1.25, 0), g1: ORr(0.3, 1.25, 0), f0: 44, f1: 40 },
  // the sound
  { t0: 36.0, t1: 38.5, p0: ST(-30, 24, -50), p1: ST(-26, 26, -52), g0: ST(25, 4, 22), g1: ST(25, 4, 22), f0: 50, f1: 48 },
  { t0: 38.5, t1: 41.0, p0: ST(30, 4, 14), p1: ST(32, 4.4, 15.5), g0: ST(52, 8, 31), g1: ST(52, 8, 31), f0: 44, f1: 40 },
  // WAIT.
  { t0: 41.0, t1: 44.0, p0: HF(0, 0.9, 0.1, 0.02), p1: HF(0, 0.6, 0.06, 0.02), g0: HF(0, 0, 0, 0), g1: HF(0, 0, 0, 0), f0: 34, f1: 30 },
  // holding it in
  { t0: 44.0, t1: 47.0, p0: HF(8, 1.0, 0.3, 0.0), p1: HF(8, 0.85, 0.25, 0.0), g0: HF(8, 0, 0, -0.06), g1: HF(8, 0, 0, -0.06), f0: 40, f1: 36 },
  { t0: 47.0, t1: 50.0, p0: HF(8, 0.9, -0.55, 0.05), p1: HF(8, 0.8, -0.5, 0.05), g0: HF(8, 0, 0, -0.02), g1: HF(8, 0, 0, -0.02), f0: 38, f1: 36 },
  { t0: 50.0, t1: 54.0, p0: BD(1.6, 1.55, 2.2), p1: BD(1.5, 1.5, 2.0), g0: BD(0, 0.9, 0.3), g1: BD(0, 0.9, 0.3), f0: 46, f1: 44 },
  // the sunny street
  { t0: 54.0, t1: 61.5, p0: V(21.0, 1.6, -4.6), p1: V(21.0, 1.6, -5.0), g0: V(20.9, 1.5, -10.0), g1: V(20.9, 1.5, -10.0), f0: 40, f1: 38, hand: 0.5 },
];

const CAPTIONS = [
  [2.5, 4.3, '11:59:57. <em>8.2 billion</em> people.'],
  [4.3, 6.0, 'And every single nose starts to <em>tickle.</em>'],
  [6.0, 8.0, 'Ah&hellip; <em>ah&hellip;</em>'],
  [8.0, 9.3, 'Myth: your heart stops when you sneeze. <em>False.</em>'],
  [9.3, 10.6, 'Your eyes shut on their own. They <em>won\'t</em> pop out.'],
  [10.6, 13.0, '<em>CHOO!</em>'],
  [13.0, 16.0, 'Myth: a sneeze blasts out at <em>100 mph.</em>'],
  [16.0, 19.0, 'Measured peak: about <em>10 mph.</em>'],
  [19.0, 22.0, 'But the droplet cloud can travel up to <em>7&ndash;8 metres.</em>'],
  [22.0, 25.0, 'Up to about <em>40,000</em> droplets per sneeze. Times 8.2 billion.'],
  [25.0, 28.0, 'On the highway, every driver\'s eyes slam <em>shut.</em>'],
  [28.0, 31.0, 'At 60 mph, one second blind = <em>27 metres.</em>'],
  [31.0, 33.5, 'At 35,000 feet? <em>Autopilot</em> doesn\'t sneeze.'],
  [33.5, 36.0, 'In the operating room: turn <em>away</em> from the patient.'],
  [36.0, 38.5, '8.2 billion sneezes at once. <em>Deafening,</em> right?'],
  [38.5, 41.0, 'Nope. Doubling the sneezers adds just <em>3 dB</em> &mdash; you only hear the ones near you.'],
  [41.0, 42.5, '<em>WAIT.</em>'],
  [42.5, 44.0, 'What if you <em>held it in?</em>'],
  [44.0, 47.0, 'Nose pinched. Mouth shut. The pressure has <em>nowhere to go.</em>'],
  [47.0, 50.0, 'It can tear the back of your <em>throat.</em>'],
  [50.0, 52.0, 'So&hellip; which myth was <em>true?</em>'],
  [52.0, 54.0, 'None of the scary ones. The danger is <em>holding it in.</em>'],
  [54.0, 56.3, 'Bonus: <em>18&ndash;35%</em> of people sneeze just from stepping into bright light.'],
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
  camera.position.copy(_cp); camera.lookAt(_cg);
  let fov = lerp(S.f0, S.f1, e);
  if (S.punch) fov *= 1 - (S.punch === 2 ? 0.3 : 0.13) * Math.exp(-(t - S.t0) * (S.punch === 2 ? 5 : 9));
  camera.fov = fov;
  // the CHOO shakes the camera operator too
  const choo = t >= CHOO && t < 13 ? Math.exp(-(t - CHOO) * 3) : 0;
  const hand = 0.004 * (S.hand ?? 1);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(t * 0.35 + 3) * hand + noise1(t * 14 + 1) * 0.02 * choo;
  _e.x += noise1(t * 0.30 + 9) * hand * 0.7 + noise1(t * 16 + 5) * 0.02 * choo;
  _e.z += noise1(t * 0.25 + 17) * hand * 0.5;
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.userData.target = _cg.clone();
  DIR.shot = i;
}

const compact = n => n >= 1e12 ? Math.round(n / 1e12) + ' trillion' : n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? Math.round(n / 1e6) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n));
const show = (node, a) => { node.style.opacity = a.toFixed(3); node.style.visibility = a > 0.001 ? 'visible' : 'hidden'; };
const win = (t, a, b, f = 0.2) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));

function updateHUD(t, el) {
  const q = el.q;
  // hook + open loop
  const ha = t < COLD ? clamp(t / 0.25, 0, 1) * (1 - smooth(COLD - 0.2, COLD, t)) : 0;
  show(q('hook'), ha); q('hook').style.transform = `scale(${(0.92 + 0.08 * Math.min(1, ha * 1.3)).toFixed(3)})`;
  show(q('loop'), t < COLD ? smooth(0.45, 0.75, t) * (1 - smooth(COLD - 0.2, COLD, t)) : 0);
  const ca = smooth(COLD, COLD + 0.3, t) * (1 - smooth(56, 56.4, t)) * (1 - win(t, 28, 29.2, 0.1) * 0.0);
  show(q('counters'), ca); show(q('shade'), ca);

  // captions, per word, from film time
  const ci = CAPTIONS.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== DIR.cap) {
    DIR.cap = ci;
    const node = q('caption');
    if (ci < 0) node.innerHTML = '';
    else {
      const big = /^<em>(CHOO!|WAIT\.)<\/em>$/.test(CAPTIONS[ci][2]);
      const words = CAPTIONS[ci][2].replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' ')).split(' ');
      node.innerHTML = `<div class="cap${big ? ' big' : ''}${ci === 16 ? ' wait' : ''}">` + words.map(w =>
        `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ') + '</div>';
    }
    el.capSpans = node.querySelectorAll('span');
  }
  if (ci >= 0 && el.capSpans) {
    const t0 = CAPTIONS[ci][0], t1 = CAPTIONS[ci][1], out = 1 - smooth(t1 - 0.15, t1, t);
    el.capSpans.forEach((sp, k) => {
      const a = clamp((t - t0 - k * 0.05) / 0.22, 0, 1), e = 1 + 2.4 * Math.pow(a - 1, 3) + 1.4 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.8) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.4).toFixed(3)}cqw) scale(${(0.72 + 0.28 * e).toFixed(3)})`;
    });
  }

  // counters (all from the field)
  q('cPpl').textContent = compact(SN.sneezed);
  q('cClock').textContent = fmtClock(SN.clock);
  q('cDrops').textContent = SN.droplets > 0 ? compact(SN.droplets) : '0';
  q('cMph').textContent = `${SN.airflow.toFixed(1)} mph`;
  q('cBlind').textContent = `${SN.blind.toFixed(1)} m`;

  // centre meter: speed myth -> real; tape measure; blind distance; decibels
  const m = q('meter');
  let ma = 0;
  if (t >= 13 && t < 19) {
    ma = win(t, 13, 19);
    const v = t < 16 ? lerp(0, 100, smooth(13.2, 14.4, t)) : lerp(100, 10.1, smooth(16.0, 17.0, t));
    q('mLabel').textContent = 'SNEEZE SPEED'; q('mVal').textContent = `${Math.round(v)} mph`;
    q('mSub').textContent = t < 16 ? 'the internet says' : 'Tang et al., PLOS ONE 2013 · ~4.5 m/s';
    m.classList.toggle('bad', t < 16);
    show(q('stamp'), win(t, 14.6, 16.0, 0.12)); q('stamp').textContent = 'MYTH ✗';
  } else if (t >= 19 && t < 25) {
    ma = win(t, 19, 25);
    q('mLabel').textContent = 'DROPLET CLOUD';
    q('mVal').textContent = `${cloudReach(SN.s - CHOO).toFixed(1)} m`;
    q('mSub').textContent = 'Bourouiba, MIT · JAMA 2020';
    m.classList.remove('bad');
  } else if (t >= 28 && t < 31) {
    ma = win(t, 28, 31);
    q('mLabel').textContent = 'DRIVEN WITH EYES SHUT';
    q('mVal').textContent = `${SN.blind.toFixed(1)} m`;
    q('mSub').textContent = '26.8 m/s (60 mph) × 1 s';
    m.classList.toggle('bad', SN.blind > 0.5);
  } else if (t >= 38.5 && t < 41) {
    ma = win(t, 38.5, 41);
    const k = Math.floor(clamp((t - 38.7) / 0.22, 0, 10)), n = Math.pow(2, k);
    q('mLabel').textContent = `SNEEZERS NEAR YOU: ${n.toLocaleString('en-US')}`;
    q('mVal').textContent = `+${(10 * Math.log10(n)).toFixed(0)} dB`;
    q('mSub').textContent = 'each doubling adds ~3 dB';
    m.classList.remove('bad');
  }
  show(m, ma);
  if (!(t >= 8.0 && t < 10.6) && !(t >= 13 && t < 19)) show(q('stamp'), 0);
  if (t >= 8.0 && t < 10.6) { q('stamp').textContent = 'MYTH ✗'; show(q('stamp'), win(t, 8.5, 10.4, 0.12)); }

  // tape measure in the world: only for the side-on cloud
  if (WORLD.tape) WORLD.tape.visible = t >= 19 && t < 25;

  // eyelids closing on the POV driver
  const lid = t >= 28 && t < 31 ? smooth(28.0, 28.12, t) * (1 - smooth(28.92, 29.05, t)) : 0;
  q('lidT').style.height = (lid * 52).toFixed(2) + '%'; q('lidB').style.height = (lid * 52).toFixed(2) + '%';

  // the throat diagram and the myth list
  show(q('xray'), win(t, 47.1, 50.0, 0.3));
  q('xray').style.setProperty('--p', (0.5 + 0.5 * Math.sin(t * 9)).toFixed(3));
  show(q('myths'), win(t, 50.2, 54.0, 0.3));
  show(q('mTrue'), smooth(52.0, 52.3, t));
  q('myths').querySelectorAll('.x').forEach((n, k) => show(n, smooth(50.5 + k * 0.35, 50.7 + k * 0.35, t)));

  show(q('endcard'), smooth(56, 56.6, t));
}
