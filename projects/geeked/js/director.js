'use strict';
// =====================================================================
// DIRECTOR — shots, captions, counters, end card.
// Attention structure:
//   * cold open on the climax (a 40,000-person dance circle) with the question
//   * an open loop in the first second: "1 creature on Earth isn't. Find it."
//   * a cut every ~3 s, alternating scale, with a zoom "punch" on comedy beats
//   * escalation (a person -> a street -> the markets -> the world)
//   * a hard pattern interrupt: everything goes silent and grey ("WAIT.")
//   * the payoff of the open loop at the end, then a question for the comments
// =====================================================================

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const P0 = () => PLAZA;
const PL = (dx, dy, dz) => () => V(PLAZA.x + dx, dy, PLAZA.z + dz);
// Kevin, live: follows wherever his pose puts him
const KV = (dx, dy, dz) => () => { const p = PEOPLE.cast[0], P = poseOf(p, GK.s); return V(P.x + dx, 0.15 + 1.66 * p.h + dy, P.z + dz); };
const PLN = (dx, dy, dz) => () => planePos(GK.t, new THREE.Vector3()).add(V(dx, dy, dz));
const DOG = (dx, dy, dz) => () => V(WORLD.BENCH.x + 0.4 + dx, 1.08 + dy, WORLD.BENCH.z - 0.17 + dz);

const SHOTS = [
  // COLD OPEN — the climax, title over it
  { t0: 0, t1: 2.4, p0: PL(-15, 6.5, -19), p1: PL(-12, 5.5, -16), g0: PL(0, 1.5, 0), g1: PL(0, 1.6, 0), f0: 50, f1: 46 },
  // 8:00 AM
  { t0: 2.4, t1: 4.2, p0: V(-47, 1.7, 10.7), p1: V(-44, 1.7, 10.5), g0: V(-4, 3, 2), g1: V(-3, 3, 2), f0: 40, f1: 38, punch: 1 },
  { t0: 4.2, t1: 6.0, p0: KV(-1.3, -0.1, 2.0), p1: KV(-1.05, -0.05, 1.6), g0: KV(0, -0.05, 0), g1: KV(0, -0.02, 0), f0: 42, f1: 40 },
  // THE MOMENT — dolly zoom on Kevin as his pupils go
  { t0: 6.0, t1: 8.0, p0: KV(-0.5, 0, 0.75), p1: KV(-1.8, 0.1, 2.7), g0: KV(0, -0.02, 0), g1: KV(0, -0.02, 0), f0: 62, f1: 20, ease: 'out' },
  // STEP 1: walking
  { t0: 8.0, t1: 11.0, p0: V(-56, 1.6, -10.6), p1: V(-54, 1.6, -10.4), g0: V(-24, 1.2, -9.6), g1: V(-23, 1.2, -9.6), f0: 24, f1: 22, punch: 1 },
  // TRAFFIC
  { t0: 11.0, t1: 14.0, p0: V(-36, 9, -4), p1: V(-32, 10, -4), g0: V(-12, 0, 1), g1: V(-10, 0, 1), f0: 46, f1: 42 },
  // KEVIN
  { t0: 14.0, t1: 17.0, p0: KV(-1.05, 0.0, 1.45), p1: KV(-0.9, 0.0, 1.25), g0: KV(0.04, 0.07, 0.12), g1: KV(0.04, 0.07, 0.12), f0: 46, f1: 42, punch: 1 },
  // LAMP POST
  { t0: 17.0, t1: 20.0, p0: V(-12.0, 1.7, 5.9), p1: V(-12.4, 1.68, 6.3), g0: V(-14, 1.55, 8.1), g1: V(-14, 1.55, 8.1), f0: 44, f1: 40, punch: 1 },
  // SNACKS
  { t0: 20.0, t1: 23.0, p0: V(9.5, 1.6, 10.8), p1: V(8, 1.6, 10.6), g0: V(-0.5, 1.5, 8.2), g1: V(-0.8, 1.5, 8.2), f0: 46, f1: 42 },
  // 35,000 FEET
  { t0: 23.0, t1: 26.0, p0: PLN(-34, 8, 62), p1: PLN(-22, 5, 50), g0: PLN(4, 0, 0), g1: PLN(2, 0, 0), f0: 46, f1: 46, hand: 0.4 },
  // MARKETS
  { t0: 26.0, t1: 29.0, p0: V(-31, 4.0, 8.5), p1: V(-32, 4.4, 7.6), g0: V(-34, 11.6, -11.6), g1: V(-34, 11.8, -11.6), f0: 46, f1: 40, punch: 1 },
  // POLICE
  { t0: 29.0, t1: 32.0, p0: V(37, 1.5, 17.5), p1: V(36.2, 1.55, 16.8), g0: V(31.5, 1.3, 12.6), g1: V(31.8, 1.4, 12.8), f0: 48, f1: 44 },
  // WORLD LEADERS
  { t0: 32.0, t1: 35.0, p0: V(-38, 4.2, 9), p1: V(-36.5, 4.6, 8), g0: V(-34, 12, -11.6), g1: V(-34, 12, -11.6), f0: 44, f1: 38, punch: 1 },
  // DANCE CIRCLE
  { t0: 35.0, t1: 38.0, p0: PL(-10, 1.7, -14), p1: PL(-8, 1.8, -12.5), g0: PL(0, 1.4, 0), g1: PL(0, 1.4, 0), f0: 48, f1: 46 },
  { t0: 38.0, t1: 41.0, p0: PL(-26, 34, -40), p1: PL(-24, 42, -38), g0: PL(0, 0, 0), g1: PL(0, 0, 0), f0: 42, f1: 44 },
  // WAIT.
  { t0: 41.0, t1: 44.2, p0: V(-6, 0.55, -1.5), p1: V(-4.5, 0.6, -0.8), g0: V(4, 0.9, 1.5), g1: V(4, 0.9, 1.5), f0: 44, f1: 36 },
  // THE MORNING AFTER
  { t0: 44.2, t1: 47.2, p0: V(-16, 1.7, -3.8), p1: V(-15, 1.7, -3.4), g0: V(-8, 0.9, -9), g1: V(-8, 1.1, -9), f0: 44, f1: 42 },
  { t0: 47.2, t1: 50.0, p0: PL(-9, 1.6, -14), p1: PL(-8.5, 1.6, -13.5), g0: PL(0, 1.3, 0), g1: PL(0, 1.3, 0), f0: 46, f1: 44 },
  // THE PAYOFF
  { t0: 50.0, t1: 53.0, p0: DOG(0.3, -0.2, -3.6), p1: DOG(0.2, -0.22, -3.0), g0: DOG(0, -0.25, 0), g1: DOG(0, -0.22, 0), f0: 40, f1: 36 },
  { t0: 53.0, t1: 61.5, p0: DOG(0.05, -0.02, -0.95), p1: DOG(0.03, -0.01, -0.72), g0: DOG(0, 0, 0), g1: DOG(0, 0, 0), f0: 40, f1: 38, punch: 1, hand: 0.4 },
];

const CAPTIONS = [
  [2.4, 4.2, '8:00 AM. A <em>normal</em> Monday.'],
  [4.2, 6.0, 'This is Kevin. Kevin has <em>no idea.</em>'],
  [6.0, 8.0, 'At 8:01, everyone on Earth gets <em>GEEKED.</em>'],
  [8.0, 11.0, 'Step 1: nobody remembers how <em>walking</em> works.'],
  [11.0, 14.0, 'Traffic drops to <em>4 mph.</em> Somehow, there are still 9 crashes.'],
  [14.0, 17.0, 'Kevin has been staring at his hand for <em>40 minutes.</em>'],
  [17.0, 20.0, 'This man is explaining his whole life to a <em>lamp post.</em>'],
  [20.0, 23.0, 'Every snack on the planet: gone in <em>11 minutes.</em>'],
  [23.0, 26.0, 'At 35,000 feet, <em>autopilot</em> is now the most responsible pilot alive.'],
  [26.0, 29.0, 'The stock market is up <em>900%.</em> Nobody knows why.'],
  [29.0, 32.0, 'Police respond&hellip; by <em>joining in.</em>'],
  [32.0, 35.0, 'World leaders call an emergency meeting. It\'s about <em>snacks.</em>'],
  [35.0, 38.0, 'Hour 3: somebody starts a <em>dance circle.</em>'],
  [38.0, 41.0, 'Hour 5: it\'s <em>40,000</em> people.'],
  [41.0, 42.6, '<em>WAIT.</em>'],
  [42.6, 44.2, 'Nobody can drive. Not even the <em>ambulances.</em>'],
  [44.2, 47.2, 'Hour 9. It wears off. <em>All at once.</em>'],
  [47.2, 50.0, 'Nobody talks about it. <em>Ever.</em>'],
  [50.0, 53.0, 'Remember the <em>one</em> creature who wasn\'t geeked?'],
  [53.0, 54.8, 'He saw <em>everything.</em>'],
  [54.8, 56.4, 'He will never look at you the <em>same way.</em>'],
];

const DIR = { shot: -1, cap: -1 };
const _cp = new THREE.Vector3(), _cg = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const evalT = g => (typeof g === 'function' ? g() : g);

function updateCamera(t, camera) {
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  const S = SHOTS[i];
  const u = clamp((t - S.t0) / (S.t1 - S.t0), 0, 1);
  const e = S.ease === 'out' ? 1 - Math.pow(1 - u, 2.2) : easeInOut(u) * 0.35 + u * 0.65;
  _cp.lerpVectors(evalT(S.p0), evalT(S.p1), e);
  _cg.lerpVectors(evalT(S.g0), evalT(S.g1), e);
  camera.position.copy(_cp);
  camera.lookAt(_cg);
  let fov = lerp(S.f0, S.f1, e);
  if (S.punch) fov *= 1 - 0.14 * Math.exp(-(t - S.t0) * 9);      // zoom punch on the cut
  camera.fov = fov;
  const hand = 0.005 * (S.hand ?? 1), g = GK.geek * (1 - GK.silence);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(t * 0.35 + 3) * hand + noise1(t * 0.5 + 21) * 0.02 * g;
  _e.x += noise1(t * 0.30 + 9) * hand * 0.7 + noise1(t * 0.45 + 2) * 0.012 * g;
  _e.z += noise1(t * 0.25 + 17) * hand * 0.5 + Math.sin(t * 0.8) * 0.045 * g;   // the geeked camera sways too
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.userData.target = _cg.clone();
  DIR.shot = i;
}

const compact = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? Math.round(n / 1e6) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n));

function updateHUD(t, el) {
  const ha = t < COLD ? clamp(t / 0.25, 0, 1) * (1 - smooth(COLD - 0.2, COLD, t)) : 0;
  el.hook.style.opacity = ha.toFixed(3);
  el.hook.style.transform = `scale(${(0.9 + 0.1 * Math.min(1, ha * 1.3) + Math.sin(t * 9) * 0.006).toFixed(3)})`;
  el.loop.style.opacity = (t < COLD ? smooth(0.5, 0.8, t) * (1 - smooth(COLD - 0.2, COLD, t)) : 0).toFixed(3);
  const ca = smooth(COLD, COLD + 0.3, t) * (1 - smooth(56, 56.4, t));
  el.counters.style.opacity = ca.toFixed(3);
  el.shade.style.opacity = ca.toFixed(3);

  const ci = CAPTIONS.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== DIR.cap) {
    DIR.cap = ci;
    if (ci < 0) el.caption.innerHTML = '';
    else {
      const words = CAPTIONS[ci][2].replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' ')).split(' ');
      el.caption.innerHTML = `<div class="cap${ci === 14 ? ' wait' : ''}">` + words.map(w =>
        `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ') + '</div>';
    }
    el.capSpans = el.caption.querySelectorAll('span');
  }
  if (ci >= 0 && el.capSpans) {
    const t0 = CAPTIONS[ci][0], t1 = CAPTIONS[ci][1];
    const out = 1 - smooth(t1 - 0.15, t1, t);
    el.capSpans.forEach((sp, k) => {
      const a = clamp((t - t0 - k * 0.055) / 0.22, 0, 1);
      const e = 1 + 2.4 * Math.pow(a - 1, 3) + 1.4 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.8) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.5).toFixed(3)}cqw) scale(${(0.7 + 0.3 * e).toFixed(3)}) rotate(${(GK.geek * Math.sin(t * 2 + k) * 2.5).toFixed(2)}deg)`;
    });
  }

  el.ppl.textContent = compact(GK.people);
  el.pplBox.classList.toggle('hot', GK.people > 1);
  el.snk.textContent = `${Math.round(GK.snacks * 100)}%`;
  el.crash.textContent = String(Math.round(GK.crashes));
  el.circ.textContent = Math.round(GK.circle).toLocaleString('en-US');

  const ea = smooth(56, 56.6, t);
  el.end.style.opacity = ea.toFixed(3);
  el.end.style.visibility = ea > 0.001 ? 'visible' : 'hidden';
}
