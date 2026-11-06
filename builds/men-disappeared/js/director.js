'use strict';
// =====================================================================
// DIRECTOR — shots, story-time mapping, HUD. Every HUD property is a pure
// function of film time; no CSS transitions or animations.
// =====================================================================

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DURATION = 61;
const END_T = 55;

// Film time -> story time. Only the cold open differs: it shows the END of the story
// (everyone already turned to face you) under the title, then hard-cuts to 3:12 PM.
function storyTime(T) { return T < 2.2 ? 33.2 + T * 0.3 : T; }

// POV: sitting on the towel, eye at ~0.92 m. yaw + toward +x (which is screen LEFT
// looking out to sea), pitch + up.
const EYE = V(0, 0.86, -0.08);
function povLook(yaw, pitch) { return V(EYE.x + Math.sin(yaw) * Math.cos(pitch), EYE.y + Math.sin(pitch), EYE.z + Math.cos(yaw) * Math.cos(pitch)); }

const SHOTS = [
  // A — cold open: overhead, every woman on the beach turned toward the one man left
  { t0: 0, t1: 2.2, p0: V(0.6, 15.5, -12.5), p1: V(0.5, 13.5, -11), g0: V(0, 0, 6), g1: V(0, 0, 6), f0: 52, f1: 52, hand: 0.4 },
  // B — POV calm. Pan from the volleyball (screen right) to the couple + grill, then the event
  { t0: 2.2, t1: 7.7, pov: t => {
      const yaw = trackLin([[2.2, 0.02], [3.4, 0.0], [4.6, -0.12], [5.6, 0.1], [7.7, 0.12]], t);
      const pit = trackLin([[2.2, -0.85], [3.1, -0.82], [4.3, -0.2], [7.7, -0.18]], t);
      const jolt = smooth(T_EVENT, T_EVENT + 0.18, t) * (1 - smooth(T_EVENT + 0.5, T_EVENT + 1.4, t));
      return { yaw: yaw + 0.04 * jolt * Math.sin(t * 30), pitch: pit + 0.07 * jolt };
    }, f0: 62, f1: 60, hand: 1 },
  // C — volleyball, low at the end of the net: the lob comes down on an empty side
  { t0: 7.7, t1: 10.4, p0: V(1.8, 0.55, 14.4), p1: V(1.6, 0.6, 14.6), g0: V(-6, 1.7, 15.9), g1: V(-6, 1.4, 16.0), f0: 52, f1: 50, hand: 1 },
  // D — the woman beside the vanished man turns to talk to him
  { t0: 10.4, t1: 13.0, p0: V(0.9, 0.85, 10.4), p1: V(1.0, 0.8, 9.9), g0: V(1.9, 0.4, 6.2), g1: V(1.9, 0.4, 6.2), f0: 46, f1: 43, hand: 1 },
  // E — the grill, unattended, smoking
  { t0: 13.0, t1: 15.6, p0: V(0.6, 1.25, 6.6), p1: V(1.0, 1.25, 7.2), g0: V(3.6, 1.5, 11.3), g1: V(3.6, 1.8, 11.3), f0: 48, f1: 45, hand: 1 },
  // F — the jet ski ploughs into the shallows
  { t0: 15.6, t1: 18.6, p0: V(11.5, 1.0, 21.5), p1: V(11.0, 0.95, 22.0), g0: () => jsLook(15.6), g1: () => jsLook(18.6), f0: 50, f1: 50, hand: 1.3, track: true },
  // G — the empty lifeguard tower
  { t0: 18.6, t1: 21.4, p0: V(-5.2, 2.0, 29.5), p1: V(-5.8, 2.0, 29.0), g0: V(-14, 3.2, 24), g1: V(-14, 3.3, 24), f0: 42, f1: 39, hand: 1 },
  // H — eye level wide: women up, looking around
  { t0: 21.4, t1: 24.4, p0: V(7.5, 1.6, -1.5), p1: V(6.5, 1.6, -1.0), g0: V(-3, 1.0, 14), g1: V(-4, 1.0, 14), f0: 50, f1: 50, hand: 1 },
  // I — overhead: the whole beach turns to look at you
  { t0: 24.4, t1: 30.0, p0: V(1.5, 26, -6), p1: V(0.6, 15, -12), g0: V(0, 0, 9), g1: V(0, 0, 6), f0: 52, f1: 52, hand: 0.4, ease: 'in' },
  // J — POV: down at your hands, then up. Everyone is staring. Hearts pop.
  { t0: 30.0, t1: 38.2, pov: t => {
      const pitch = trackLin([[30, -0.25], [30.4, -0.95], [32.6, -0.95], [33.5, -0.1], [38.2, -0.02]], t);
      const yaw = trackLin([[30, 0.0], [32.6, 0.0], [33.5, -0.05], [35, 0.08], [36.6, -0.12], [38.2, 0.05]], t);
      return { yaw, pitch };
    }, f0: 60, f1: 60, hand: 1 },
  // K — overhead: the ring closes in
  { t0: 38.2, t1: 41.6, p0: V(0.6, 12.5, -9.5), p1: V(0.4, 8.5, -6.5), g0: V(0, 0, 4), g1: V(0, 0, 2.5), f0: 52, f1: 54, hand: 0.6 },
  // L — POV: you stand, turn, and bolt for the water
  { t0: 41.6, t1: 44.6, live: t => {
      const st = youState(t);
      const eyeY = lerp(0.86, 1.66, st.up) + st.y + 0.035 * Math.abs(Math.sin(st.phase)) * st.run;
      const yawW = st.h + 0.05 * Math.sin(st.phase) * st.run;
      const p = V(st.x + Math.sin(st.h) * 0.12, eyeY, st.z + Math.cos(st.h) * 0.12 + (1 - st.up) * 0.04);
      const pitch = lerp(-0.02, -0.12, st.up) + 0.02 * Math.sin(st.phase * 2) * st.run;
      return { p, g: V(p.x + Math.sin(yawW) * 5, p.y + Math.sin(pitch) * 5, p.z + Math.cos(yawW) * 5) };
    }, f0: 62, f1: 66, hand: 1.6 },
  // M — tracking in front of you, the whole beach charging behind
  { t0: 44.6, t1: 48.4, live: t => {
      const st = youState(t), q = youPos(t + 1.15);
      const p = V(q.x + 1.6, groundY(q.x, q.z) + 1.35, q.z + 0.3);
      return { p, g: V(st.x - Math.sin(st.h) * 4, groundY(st.x, st.z) + 1.0, st.z - Math.cos(st.h) * 4) };
    }, f0: 50, f1: 50, hand: 1.6 },
  // N — side-on from the shallows, sprinting along the waterline
  { t0: 48.4, t1: 51.8, live: t => {
      const st = youState(t);
      return { p: V(st.x + 6, 2.0, 40), g: V(st.x - 4, 0.9, st.z) };
    }, f0: 60, f1: 60, hand: 1.2 },
  // O — pull up and away: one man, a beach full of pursuers (held under the end card)
  { t0: 51.8, t1: 61, live: t => {
      const st = youState(t), u = smooth(51.8, 58, t);
      return { p: V(st.x - 16 - 6 * u, 4 + 22 * u, st.z - 10 - 6 * u), g: V(st.x - 6, 0, st.z) };
    }, f0: 50, f1: 50, hand: 0.6 },
];

function jsLook(t) { const J = jetskiState(Math.max(t, 0)); return V(J.x, 0.6, J.z); }

const CAPTIONS = [
  [2.2, 4.7, '3:12 PM. Just a <em>normal</em> day.'],
  [4.7, 6.0, 'Sun out. Beach <em>packed.</em>'],
  [6.0, 8.6, 'Then — every man. <em>Gone.</em>'],
  [8.6, 10.4, 'Mid-<em>serve.</em>'],
  [10.4, 13.0, 'She was <em>mid-sentence.</em>'],
  [13.0, 15.6, 'Burgers: <em>unsupervised.</em>'],
  [15.6, 18.6, 'The jet ski didn’t get <em>the memo.</em>'],
  [18.6, 21.4, 'You are now <em>the lifeguard.</em>'],
  [21.4, 24.4, 'Wait. Who’s <em>left?</em>'],
  [24.4, 30.0, 'Everyone is looking <em>at you.</em>'],
  [30.0, 33.2, 'Same hands. <em>Still here.</em>'],
  [33.2, 35.4, 'The last man <em>on Earth.</em>'],
  [35.4, 38.2, 'Then it <em>dawns</em> on them.'],
  [38.2, 41.6, 'Every woman on Earth. <em>One</em> man.'],
  [41.6, 44.6, '<em>Run.</em>'],
  [44.6, 48.4, 'The last man alive is <em>very</em> popular.'],
  [48.4, 51.8, 'Cardio is now <em>mandatory.</em>'],
  [51.8, 55.0, 'Only <em>4 billion</em> to go.'],
];

const DIR = { shot: -1, cap: -1 };
const _cp = new THREE.Vector3(), _cg = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const evalT = g => (typeof g === 'function' ? g() : g);

function updateCamera(T, camera) {
  let i = SHOTS.findIndex(s => T >= s.t0 && T < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  const S = SHOTS[i];
  const u = clamp((T - S.t0) / (S.t1 - S.t0), 0, 1);
  const e = S.ease === 'in' ? 1 - Math.pow(1 - u, 2.2) : easeInOut(u) * 0.5 + u * 0.5;
  if (S.pov) {
    const o = S.pov(T);
    _cp.copy(EYE); _cg.copy(povLook(o.yaw, o.pitch));
  } else if (S.live) {
    const o = S.live(T); _cp.copy(o.p); _cg.copy(o.g);
  } else {
    _cp.lerpVectors(S.p0, S.p1, e);
    if (S.track) { const J = jetskiState(Math.min(T, JS_BEACH_T + 2)); _cg.set(J.x, 0.6, J.z); }
    else _cg.lerpVectors(evalT(S.g0), evalT(S.g1), e);
  }
  camera.position.copy(_cp);
  camera.lookAt(_cg);
  camera.fov = lerp(S.f0, S.f1, e);
  // handheld drift: smooth noise, never per-frame random
  const hand = 0.006 * (S.hand ?? 1);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(T * 0.35 + 3) * hand;
  _e.x += noise1(T * 0.30 + 9) * hand * 0.7;
  _e.z += noise1(T * 0.25 + 17) * hand * 0.4;
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.userData.target = _cg.clone();
  DIR.shot = i; DIR.pov = !!S.pov || i === SHOTS.findIndex(s => s.t0 === 41.6);
}

// ---------------- HUD ----------------
const MEN0 = 4.08e9;      // ≈ men on Earth (UN World Population Prospects, ~50.2% of 8.1 bn)
function menAt(t) {
  if (t < T_EVENT) return Math.round(MEN0 + t * 0.9);
  const u = clamp((t - T_EVENT) / 1.7, 0, 1);
  const e = 1 - Math.pow(1 - u, 2.2);
  return Math.max(1, Math.round(Math.pow(MEN0, 1 - e)));
}
const fmt = n => n.toLocaleString('en-US');

function updateHUD(T, el) {
  const t = storyTime(T);
  // title card: on for the cold open, gone by 2.45 s
  const hk = T < 2.2 ? 1 : 0;
  el.hook.style.opacity = hk;
  const hs = 0.94 + 0.06 * smooth(0, 0.35, T);
  el.hook.style.transform = `scale(${hs.toFixed(4)})`;

  // counter
  const showC = T >= 2.2 && T < END_T;
  el.counter.style.opacity = showC ? 1 : 0;
  const n = menAt(T);
  el.men.textContent = fmt(n);
  el.counter.classList.toggle('one', n === 1);
  el.sub.textContent = n === 1 ? 'just you' : (T >= T_EVENT ? 'and falling' : 'and counting');

  // captions, per-word pop from film time
  const ci = CAPTIONS.findIndex(c => T >= c[0] && T < c[1]);
  if (ci !== DIR.cap) {
    DIR.cap = ci;
    if (ci < 0) el.caption.innerHTML = '';
    else {
      const words = CAPTIONS[ci][2]
        .replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' '))
        .split(' ');
      el.caption.innerHTML = words.map(w =>
        `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ');
    }
    el.capSpans = el.caption.querySelectorAll('span');
  }
  if (ci >= 0 && el.capSpans) {
    const t0 = CAPTIONS[ci][0], t1 = CAPTIONS[ci][1];
    const out = 1 - smooth(t1 - 0.2, t1, T);
    el.capSpans.forEach((sp, k) => {
      const a = clamp((T - t0 - k * 0.06) / 0.26, 0, 1);
      const ov = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.6) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.4).toFixed(3)}cqw) scale(${(0.75 + 0.25 * ov).toFixed(3)})`;
    });
  }

  // end card
  const ea = smooth(END_T, END_T + 0.5, T);
  el.end.style.opacity = ea.toFixed(3);
  el.endItems.forEach((n, k) => {
    const a = smooth(END_T + 0.3 + k * 0.45, END_T + 0.75 + k * 0.45, T);
    n.style.opacity = a.toFixed(3);
    n.style.transform = `translateY(${((1 - a) * 2).toFixed(3)}cqw)`;
  });
}
