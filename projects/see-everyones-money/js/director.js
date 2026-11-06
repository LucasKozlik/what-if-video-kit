'use strict';
// =====================================================================
// DIRECTOR — camera shots, captions, counters, title and end card.
// Cold open on the payoff (the billionaire beat), then back to 8:14 AM.
// =====================================================================

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// a point relative to a character, re-evaluated every frame (pure function of time)
const near = (p, dx, dy, dz) => () => { const q = personAt(p, FIELD.st); return V(q.x + dx, dy, q.z + dz); };

const SHOTS = [
  // 0 COLD OPEN — the crowd frozen around him, numbers everywhere
  { t0: 0, t1: COLD_OPEN, p0: V(-10, 9.5, -7), p1: V(-8.5, 8.2, -5.8), g0: V(-1, 1.6, 8.5), g1: V(0, 1.6, 8.6), f0: 54, f1: 48, hand: 1 },
  // 1 8:14 AM — eye level on the north sidewalk, nothing to see
  { t0: COLD_OPEN, t1: 6.5, p0: V(-10.5, 1.65, 7.6), p1: V(-11.6, 1.65, 7.7), g0: V(-36, 1.5, 10.2), g1: V(-36, 1.5, 10), f0: 46, f1: 44, hand: 1 },
  // 2 her — walking toward us; her number appears
  { t0: 6.5, t1: 10.2, p0: near(HER, 5.4, 1.62, -1.8), p1: near(HER, 4.2, 1.6, -1.5), g0: near(HER, 0, 1.55, 0), g1: near(HER, 0, 1.75, 0), f0: 42, f1: 36, focus: HER, hand: 1 },
  // 3 crane up: the wave runs down the avenue
  { t0: 10.2, t1: 14.6, p0: V(-13, 2.6, 10.2), p1: V(-9, 7.5, 10.0), g0: V(-34, 1.4, 9.6), g1: V(-46, 0.2, 9.4), f0: 54, f1: 58, hand: 0.8 },
  // 4 across the avenue at the crowd of numbers
  { t0: 14.6, t1: 18.4, p0: V(-4, 1.7, -10.4), p1: V(-6, 1.7, -10.0), g0: V(-22, 2.1, 9.5), g1: V(-26, 2.1, 9.5), f0: 46, f1: 42, hand: 1 },
  // 5 the student, red
  { t0: 18.4, t1: 22.2, p0: near(STUDENT, -5.4, 1.6, 1.9), p1: near(STUDENT, -4.2, 1.62, 1.6), g0: near(STUDENT, 0, 1.6, 0), g1: near(STUDENT, 0, 1.8, 0), focus: STUDENT, f0: 44, f1: 40, hand: 1 },
  // 6 the sharp suit
  { t0: 22.2, t1: 26.2, p0: near(SUIT, 5.6, 1.7, -2.0), p1: near(SUIT, 4.4, 1.7, -1.7), g0: near(SUIT, 0, 1.65, 0), g1: near(SUIT, 0, 1.85, 0), focus: SUIT, f0: 44, f1: 40, hand: 1 },
  // 7 the woman at the bus stop
  { t0: 26.2, t1: 30.2, p0: V(-17.4, 1.5, 7.4), p1: V(-17.9, 1.5, 7.9), g0: V(-19.6, 1.5, 11.4), g1: V(-19.6, 1.65, 11.4), f0: 46, f1: 40, focus: GRAN, hand: 1 },
  // 8 the middle: wide down the street as a black car arrives
  { t0: 30.2, t1: 33.6, p0: V(-30, 4.5, -3), p1: V(-24, 4.0, -2), g0: V(-6, 1.8, 7), g1: V(0, 1.8, 7.5), f0: 48, f1: 46, hand: 0.8 },
  // 9 low angle: he steps out
  { t0: 33.6, t1: 37.6, p0: V(-3.2, 0.8, 11.4), p1: V(-2.6, 0.75, 11.0), g0: () => V(BILLIONAIRE.pos.x, 1.7, BILLIONAIRE.pos.z), g1: () => V(BILLIONAIRE.pos.x, 2.1, BILLIONAIRE.pos.z), f0: 50, f1: 46, hand: 1, focus: BILLIONAIRE },
  // 10 the average explodes
  { t0: 37.6, t1: 42.0, p0: V(-9, 2.2, -1.5), p1: V(-6.5, 2.1, -0.5), g0: V(1.5, 2.0, 8.8), g1: V(2, 2.1, 8.9), f0: 50, f1: 44, hand: 1 },
  // 11 overhead: every head turns toward him
  { t0: 42.0, t1: 47.0, p0: V(-6, 19, -2), p1: V(-3, 25, 0), g0: V(1, 0, 8.5), g1: V(1.5, 0, 8.8), f0: 54, f1: 52, hand: 0.5 },
  // 12 rise above the avenue: a whole street of numbers
  { t0: 47.0, t1: 52.4, p0: V(16, 14, 1), p1: V(34, 50, 1), g0: V(-14, 0, 7), g1: V(-34, 0, 6), f0: 50, f1: 54, hand: 0.4, ease: 'out' },
  // 13 back down to one face in the crowd
  { t0: 52.4, t1: 61.5, p0: V(-3.5, 1.65, 6.4), p1: V(-3.2, 1.65, 6.6), g0: V(2.2, 1.9, 9.0), g1: V(2.2, 1.9, 9.0), f0: 42, f1: 36, hand: 0.8 },
];

const millions = v => Math.round(v / 1e6) + ' million';
const about = v => '$' + (Math.round(v / 5000) * 5000).toLocaleString('en-US');
const CAPTIONS = [
  [2.6, 4.6, '8:14 AM. A <em>normal</em> commute.'],
  [4.6, 6.6, 'Strangers. Nothing to see.'],
  [6.6, 8.4, 'Then a <em>number</em> appears.'],
  [8.4, 10.3, 'Above her head. <em>Only</em> hers.'],
  [10.3, 12.4, 'Then above <em>everyone</em>.'],
  [12.4, 14.6, 'It’s what each person is <em>worth</em>.'],
  [14.6, 16.6, 'Everything they <em>own</em>…'],
  [16.6, 18.4, '…minus everything they <em>owe</em>.'],
  [18.4, 20.3, 'Some numbers are <em>red</em>.'],
  [20.3, 22.2, 'Student loans. Below <em>zero</em>.'],
  [22.2, 24.2, 'The guy in the <em>sharp</em> suit?'],
  [24.2, 26.2, 'Leased car. Maxed cards. <em>In the red.</em>'],
  [26.2, 28.2, 'The woman at the bus stop?'],
  [28.2, 30.2, '<em>$1.24 million.</em> Saved for 40 years.'],
  [30.2, 32.0, 'The person in the <em>middle</em> of this street…'],
  [32.0, 33.6, `…has about <em>${about(FINAL.median)}</em>.`],
  [33.6, 35.6, 'Then <em>he</em> steps out.'],
  [35.6, 37.6, '<em>$3.4 billion.</em>'],
  [37.6, 39.8, `The average just jumped to <em>$${millions(FINAL.meanB)}</em>.`],
  [39.8, 42.0, 'The median? <em>Barely moved.</em>'],
  [42.0, 44.5, 'Everyone <em>stops</em>.'],
  [44.5, 47.0, 'Everyone <em>stares</em>.'],
  [47.0, 49.7, 'Now picture a whole <em>city</em> like this…'],
  [49.7, 52.4, '…where every number is <em>public</em>.'],
  [52.4, 55.4, 'Would you treat people <em>differently</em>?'],
];

const DIR = { shot: -1, cap: -1 };
const _cp = new THREE.Vector3(), _cg = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const evalT = g => (typeof g === 'function' ? g() : g);

function updateCamera(t, camera) {
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  const S = SHOTS[i];
  const u = clamp((t - S.t0) / (S.t1 - S.t0), 0, 1);
  const e = S.ease === 'out' ? 1 - Math.pow(1 - u, 2.2) : easeInOut(u) * 0.5 + u * 0.5;
  _cp.lerpVectors(evalT(S.p0), evalT(S.p1), e);
  _cg.lerpVectors(evalT(S.g0), evalT(S.g1), e);
  camera.position.copy(_cp);
  camera.lookAt(_cg);
  camera.fov = lerp(S.f0, S.f1, e);
  const hand = 0.007 * (S.hand ?? 1);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(t * 0.35 + 3) * hand;
  _e.x += noise1(t * 0.30 + 9) * hand * 0.7;
  _e.z += noise1(t * 0.25 + 17) * hand * 0.5;
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.userData.target = _cg.clone();
  DIR.shot = i;
  DIR.focus = S.focus || null;
}

function setCaption(el, ci) {
  if (ci < 0) { el.caption.innerHTML = ''; el.capSpans = null; return; }
  const words = CAPTIONS[ci][2]
    .replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' '))
    .split(' ');
  el.caption.innerHTML = words.map(w =>
    `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ');
  el.capSpans = el.caption.querySelectorAll('span');
}

function updateHUD(t, el) {
  // title over the cold open, per-line pop from film time
  const hookA = 1 - smooth(COLD_OPEN - 0.25, COLD_OPEN, t);
  el.hook.style.opacity = hookA.toFixed(3);
  el.hookLines.forEach((s, k) => {
    const a = clamp((t - 0.1 - k * 0.16) / 0.35, 0, 1);
    const ov = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
    s.style.opacity = Math.min(1, a * 1.6).toFixed(3);
    s.style.transform = `translateY(${((1 - a) * 2).toFixed(2)}cqw) scale(${(0.75 + 0.25 * ov).toFixed(3)})`;
  });

  const ctrA = smooth(10.7, 11.3, t) * (1 - smooth(55.0, 55.6, t));
  el.counters.style.opacity = ctrA.toFixed(3);

  const ci = CAPTIONS.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== DIR.cap) { DIR.cap = ci; setCaption(el, ci); }
  if (ci >= 0 && el.capSpans) {
    const t0 = CAPTIONS[ci][0], t1 = CAPTIONS[ci][1];
    const out = 1 - smooth(t1 - 0.22, t1, t);
    el.capSpans.forEach((sp, k) => {
      const a = clamp((t - t0 - k * 0.06) / 0.26, 0, 1);
      const ov = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.6) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.5).toFixed(3)}cqw) scale(${(0.7 + 0.3 * ov).toFixed(3)})`;
    });
  }

  el.cPeople.textContent = String(FIELD.revealed);
  el.cMed.textContent = FIELD.revealed ? fmtMoney(FIELD.median) : '—';
  el.cAvg.textContent = FIELD.revealed ? fmtMoney(FIELD.mean) : '—';
  // highlight the box the caption is talking about (computed from film time, no CSS animation)
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  const medHot = (t >= 30.2 && t < 33.6) || (t >= 39.8 && t < 42.0);
  const avgHot = t >= 35.4 && t < 39.8;
  el.boxMed.style.boxShadow = medHot ? `0 0 ${(2 + pulse * 2).toFixed(2)}cqw rgba(120,255,170,.65)` : 'none';
  el.boxMed.style.borderColor = medHot ? 'rgba(120,255,170,.9)' : '';
  el.boxAvg.style.boxShadow = avgHot ? `0 0 ${(2 + pulse * 2.5).toFixed(2)}cqw rgba(255,200,80,.8)` : 'none';
  el.boxAvg.style.borderColor = avgHot ? 'rgba(255,205,90,.95)' : '';
  el.cAvg.style.color = FIELD.mean > 5e6 ? '#ffd36a' : '';

  const endA = smooth(55.4, 56.2, t);
  el.end.style.opacity = endA.toFixed(3);
  LBL.box.style.opacity = (1 - endA).toFixed(3);
  el.endKids.forEach((c, k) => {
    const a = clamp((t - 55.7 - k * 0.35) / 0.5, 0, 1);
    c.style.opacity = a.toFixed(3);
    c.style.transform = `translateY(${((1 - a) * 2).toFixed(2)}cqw)`;
  });
}
