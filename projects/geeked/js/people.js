'use strict';
// =====================================================================
// PEOPLE — a small rigged cast (instanced body parts, posed on the CPU)
// and a cheap instanced crowd for the dance circle.
// Every pose is a pure function of story time: walk -> geeked role -> awkward.
// =====================================================================

const PEOPLE = { cast: [], crowd: [] };
const SKINS = ['#f1c9a5', '#d9a47c', '#a86b47', '#7a4a2e', '#e8b48f', '#5a3420'];
const SHIRTS = ['#d6453a', '#2f6fb5', '#f2c230', '#2c2c30', '#ffffff', '#4c9a5a', '#8a4fb0', '#f07a2a', '#1f8a8a', '#e86aa0'];
const PANTS = ['#2a3550', '#1d1d20', '#6b5a45', '#3a4a5a', '#5a2a2a', '#c8b89a'];
const HAIR = ['#1b1410', '#3a2618', '#6b4a2a', '#c9a060', '#2a2a2a', '#8a3a1a'];

function castDef() {
  const S = ROAD_HW + 2.4, L = [];
  // [role, target x, target z, facing yaw, extra]
  L.push(['kevin', -6, S - 0.6, -0.6]);
  L.push(['lamp', -14, ROAD_HW + 1.15, Math.PI]);
  for (let i = 0; i < 7; i++) L.push(['line', 0.2 + i * 0.78, ROAD_HW + 1.7 + (i % 2) * 0.12, -Math.PI / 2]);
  L.push(['lie', -9, -S + 0.2, 0.3]); L.push(['lie', 6, S + 0.9, 2.0]); L.push(['lie', -27, S + 0.3, 1.2]);
  L.push(['dance', 32.5, ROAD_HW + 6.2, -1.2, 'cop']);
  L.push(['dance', 29, ROAD_HW + 6.8, 2.6]); L.push(['dance', -3, -S, 0]); L.push(['dance', -1.4, -S + 0.6, 2.8]);
  L.push(['dance', 13, S, -1.4]); L.push(['dance', 14.2, S + 0.8, 1.8]);
  for (let i = 0; i < 12; i++) L.push(['wobble', -40 + i * 7.3, (i % 2 ? 1 : -1) * (S + (i % 3 - 1) * 0.7), 0]);
  return L;
}

function buildPeople(scene) {
  const R = mulberry32(31);
  const defs = castDef();
  defs.forEach((d, i) => {
    const dir = d[0] === 'wobble' ? (i % 2 ? -1 : 1) : (R() < 0.5 ? 1 : -1);
    const p = {
      role: d[0], tx: d[1], tz: d[2], face: d[3], cop: d[4] === 'cop',
      dir, speed: 1.2 + R() * 0.3, ph: R() * 6.28, delay: R() * 0.9,
      h: 0.92 + R() * 0.14, w: 0.9 + R() * 0.25,
      skin: rpick(SKINS, R), shirt: d[4] === 'cop' ? '#1c2c52' : rpick(SHIRTS, R), pants: rpick(PANTS, R), hair: rpick(HAIR, R),
    };
    if (p.role === 'kevin') { p.shirt = '#2f6fb5'; p.skin = '#e8b48f'; p.hair = '#3a2618'; }
    // walk lane, timed so they are near their spot when it hits
    p.lane = p.tz;
    p.arrive = p.role === 'kevin' ? 3.2 : G0 + 0.4 + p.delay;
    p.x0 = p.tx - p.dir * p.speed * (p.arrive + 1.2);
    PEOPLE.cast.push(p);
  });

  const N = PEOPLE.cast.length;
  const mk = (geo, mult = 1) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), N * mult);
    m.castShadow = true; m.frustumCulled = false; scene.add(m); return m;
  };
  const leg = new THREE.CylinderGeometry(0.07, 0.06, 0.86, 8); leg.translate(0, -0.43, 0);
  const shoe = new THREE.BoxGeometry(0.11, 0.08, 0.24); shoe.translate(0, -0.88, 0.05);
  const torso = new THREE.CapsuleGeometry(0.17, 0.3, 4, 10); torso.scale(1.15, 1, 0.68); torso.translate(0, 0.3, 0);
  const arm = new THREE.CylinderGeometry(0.052, 0.045, 0.6, 7); arm.translate(0, -0.3, 0);
  const hand = new THREE.SphereGeometry(0.055, 8, 6); hand.translate(0, -0.63, 0);
  const head = new THREE.SphereGeometry(0.125, 16, 12); head.scale(0.92, 1.05, 0.98); head.translate(0, 0.14, 0);
  const hair = new THREE.SphereGeometry(0.132, 16, 10, 0, 6.29, 0, 1.25); hair.translate(0, 0.155, -0.012);
  const eyeW = new THREE.SphereGeometry(0.03, 10, 8); eyeW.scale(1, 1, 0.5);
  const pupil = new THREE.SphereGeometry(0.014, 8, 6); pupil.scale(1, 1, 0.5);
  const mouth = new THREE.CapsuleGeometry(0.007, 0.05, 3, 6); mouth.rotateZ(Math.PI / 2); mouth.scale(1, 1, 0.5);
  PEOPLE.m = {
    leg: mk(leg, 2), shoe: mk(shoe, 2), torso: mk(torso), arm: mk(arm, 2), hand: mk(hand, 2),
    head: mk(head), hair: mk(hair), eyeW: mk(eyeW, 2), pupil: mk(pupil, 2), mouth: mk(mouth),
  };
  const C = c => new THREE.Color(c);
  PEOPLE.cast.forEach((p, i) => {
    const M = PEOPLE.m;
    for (const k of [0, 1]) {
      M.leg.setColorAt(i * 2 + k, C(p.pants)); M.shoe.setColorAt(i * 2 + k, C('#1a1a1a'));
      M.arm.setColorAt(i * 2 + k, C(p.shirt)); M.hand.setColorAt(i * 2 + k, C(p.skin));
      M.eyeW.setColorAt(i * 2 + k, C('#f4f4f0')); M.pupil.setColorAt(i * 2 + k, C('#111111'));
    }
    M.torso.setColorAt(i, C(p.shirt)); M.head.setColorAt(i, C(p.skin)); M.hair.setColorAt(i, C(p.hair));
    M.mouth.setColorAt(i, C('#2a0c0a'));
  });

  // ---- the dance circle crowd ----
  const CN = 1100;
  const body = new THREE.CapsuleGeometry(0.2, 0.9, 3, 8); body.translate(0, 0.65, 0);
  const chead = new THREE.SphereGeometry(0.13, 8, 6); chead.translate(0, 1.42, 0);
  const armUp = new THREE.CylinderGeometry(0.045, 0.045, 0.6, 5); armUp.translate(0, 0.3, 0);
  PEOPLE.cb = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.8 }), CN);
  PEOPLE.ch = new THREE.InstancedMesh(chead, new THREE.MeshStandardMaterial({ roughness: 0.8 }), CN);
  PEOPLE.ca = new THREE.InstancedMesh(armUp, new THREE.MeshStandardMaterial({ roughness: 0.8 }), CN * 2);
  const CR = mulberry32(8);
  for (let i = 0; i < CN; i++) {
    // inner rings fill first: the circle grows outward
    const ring = Math.sqrt(i / CN), r = 5.2 + ring * 17 + CR() * 0.8, a = CR() * 6.28;
    const c = { r, a, ph: CR() * 6.28, spd: (CR() < 0.5 ? 1 : -1) * (0.05 + CR() * 0.08), order: i / CN, bounce: 3 + CR() * 3 };
    PEOPLE.crowd.push(c);
    const sc = C(rpick(SHIRTS, CR));
    PEOPLE.cb.setColorAt(i, sc); PEOPLE.ch.setColorAt(i, C(rpick(SKINS, CR)));
    PEOPLE.ca.setColorAt(i * 2, sc); PEOPLE.ca.setColorAt(i * 2 + 1, sc);
  }
  for (const m of [PEOPLE.cb, PEOPLE.ch, PEOPLE.ca]) { m.frustumCulled = false; m.castShadow = true; scene.add(m); }
}

// ---------- posing ----------
const _R = new THREE.Matrix4(), _B = new THREE.Matrix4(), _H = new THREE.Matrix4(), _T = new THREE.Matrix4(),
      _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1);
const MX = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1, order = 'XYZ') => {
  _pe.set(rx, ry, rz, order); _pq.setFromEuler(_pe);
  return new THREE.Matrix4().compose(_pv.set(x, y, z), _pq, _ps.set(s, s, s));
};

function walkPos(p, s) { return { x: p.x0 + p.dir * p.speed * s, z: p.lane }; }

// The pose of cast member p at story time s.
function poseOf(p, s) {
  const g = GK.geek;
  const P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, roll: 0, lean: 0, bob: 0,
    legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: 0.08, armRz: 0.08, hy: 0, hp: 0, hr: 0, pupil: 1, grin: 1 };
  const w0 = walkPos(p, Math.min(s, p.arrive));
  const walkCycle = (sp, k = 1) => {
    const ph = s * sp * 5.2 + p.ph;
    P.legL = Math.sin(ph) * 0.5 * k; P.legR = -P.legL; P.armLx = -P.legL * 0.7; P.armRx = P.legL * 0.7;
    P.bob = Math.abs(Math.cos(ph)) * 0.04 * k;
  };
  P.pupil = 1 + g * 0.9; P.grin = 1 + g * 1.4;

  if (s < p.arrive || p.role === 'wobble') {
    // walking; once geeked, slower, weaving, arms out for balance
    const tg = Math.max(0, s - G0), gw = smooth(G0, G1, s);
    const dist = p.speed * Math.min(s, G0) + lerp(p.speed, 0.55, gw) * tg;
    P.x = p.x0 + p.dir * dist;
    P.z = p.lane + Math.sin(s * 1.3 + p.ph) * 0.6 * gw;
    P.yaw = Math.atan2(p.dir, 0) + Math.cos(s * 1.3 + p.ph) * 0.5 * gw;
    walkCycle(lerp(1, 0.45, gw));
    P.roll = Math.sin(s * 1.7 + p.ph) * 0.14 * gw;
    P.armLz = 0.08 + gw * 0.9; P.armRz = 0.08 + gw * 0.9;
    P.hr = Math.sin(s * 1.1 + p.ph) * 0.25 * gw;
  } else {
    // drift from where they were onto their spot
    const u = smooth(p.arrive, p.arrive + 1.4, s);
    P.x = lerp(w0.x, p.tx, u); P.z = lerp(w0.z, p.tz, u);
    P.yaw = lerp(Math.atan2(p.dir, 0), p.face, u);
    if (u < 1) walkCycle(0.6, 1 - u);
    const k = u;
    switch (p.role) {
      case 'kevin': {                     // staring at his own hand. For 40 minutes.
        const k = smooth(G0 + 1.4, G0 + 2.6, s);
        P.armRx = lerp(P.armRx, -2.05, k); P.armRz = lerp(0.08, -0.42, k);
        P.hp = -0.18 * k; P.hy = -0.22 * k + Math.sin(s * 0.7) * 0.04;
        P.roll = Math.sin(s * 0.9) * 0.05 * k; P.hr = 0.12 * k;
        break;
      }
      case 'lamp':                        // explaining his whole life to a lamp post
        P.armLx = lerp(P.armLx, -1.35, k); P.armRx = lerp(P.armRx, -1.35, k);
        P.armLz = -0.42 * k; P.armRz = -0.42 * k; P.lean = 0.12 * k;
        P.hr = Math.sin(s * 2.2) * 0.12; P.hy = 0.25 * k;
        P.bob = Math.abs(Math.sin(s * 2.4)) * 0.02;
        break;
      case 'line':                        // the snack queue: shuffling, hopeful
        P.bob = Math.abs(Math.sin(s * 3 + p.ph)) * 0.025;
        P.roll = Math.sin(s * 1.2 + p.ph) * 0.08;
        P.hy = Math.sin(s * 0.8 + p.ph) * 0.4; P.armLz = P.armRz = 0.12;
        break;
      case 'lie': {                       // snow angels on the pavement
        const l = smooth(p.arrive + 0.6, p.arrive + 1.8, s);
        P.pitch = -Math.PI / 2 * l; P.y = 0.12 * l + 0.15;
        const sa = (Math.sin(s * 2.4 + p.ph) * 0.5 + 0.5) * l;
        P.armLz = 0.2 + sa * 2.2; P.armRz = 0.2 + sa * 2.2; P.legL = -sa * 0.35; P.legR = sa * 0.35;
        break;
      }
      case 'dance': {
        const b = s * (p.cop ? 7.2 : 6.3) + p.ph;
        P.bob = Math.abs(Math.sin(b)) * 0.12 * k;
        P.armLx = -2.6 * k + Math.sin(b) * 0.4; P.armRx = -2.6 * k - Math.sin(b) * 0.4;
        P.armLz = 0.4 + Math.sin(b * 0.5) * 0.3; P.armRz = 0.4 - Math.sin(b * 0.5) * 0.3;
        P.yaw += Math.sin(s * 1.3 + p.ph) * 0.7 * k; P.roll = Math.sin(b * 0.5) * 0.12 * k;
        P.legL = Math.max(0, Math.sin(b)) * 0.4 * k; P.legR = Math.max(0, -Math.sin(b)) * 0.4 * k;
        P.hr = Math.sin(b * 0.5) * 0.3 * k;
        break;
      }
    }
  }
  // The morning after: everyone stands up, arms at their sides, avoiding eye contact.
  const a = smooth(SOBER0 + 0.6, SOBER1, s);
  if (a > 0) {
    const keep = { x: P.x, z: P.z, yaw: P.yaw };
    for (const k of Object.keys(P)) if (typeof P[k] === 'number' && !['x', 'z', 'yaw'].includes(k)) P[k] = lerp(P[k], 0, a);
    P.armLz = P.armRz = lerp(P.armLz, 0.05, a); P.pupil = lerp(P.pupil, 0.9, a); P.grin = lerp(P.grin, 0.35, a);
    P.y = lerp(P.y, 0, a); P.x = keep.x; P.z = keep.z;
    P.yaw = keep.yaw + a * (noise1(s * 0.6 + p.ph) * 0.6 + 0.8 * Math.sin(p.ph));
    P.hy = a * noise1(s * 0.9 + p.ph * 3) * 0.9; P.hp = a * 0.25;          // looking anywhere but at each other
  }
  return P;
}

function writePeople(t) {
  const s = GK.s, M = PEOPLE.m;
  PEOPLE.cast.forEach((p, i) => {
    const P = poseOf(p, s);
    const sc = p.h;
    _pe.set(P.pitch, P.yaw, P.roll, 'YXZ'); _pq.setFromEuler(_pe);
    _R.compose(_pv.set(P.x, 0.15 + P.y, P.z), _pq, _ps.set(sc * p.w, sc, sc));
    // legs
    for (const [k, side, ang] of [[0, -1, P.legL], [1, 1, P.legR]]) {
      _T.copy(_R).multiply(MX(side * 0.1, 0.92 + P.bob, 0, ang, 0, side * 0.03));
      M.leg.setMatrixAt(i * 2 + k, _T); M.shoe.setMatrixAt(i * 2 + k, _T);
    }
    _B.copy(_R).multiply(MX(0, 0.92 + P.bob, 0, P.lean, 0, 0));
    M.torso.setMatrixAt(i, _B);
    for (const [k, side, ax, az] of [[0, -1, P.armLx, P.armLz], [1, 1, P.armRx, P.armRz]]) {
      _T.copy(_B).multiply(MX(side * 0.235, 0.56, 0, ax, 0, side * az, 1, 'ZYX'));
      M.arm.setMatrixAt(i * 2 + k, _T); M.hand.setMatrixAt(i * 2 + k, _T);
    }
    _H.copy(_B).multiply(MX(0, 0.6, 0, P.hp, P.hy, P.hr, 1, 'YXZ'));
    M.head.setMatrixAt(i, _H); M.hair.setMatrixAt(i, _H);
    for (const [k, side] of [[0, -1], [1, 1]]) {
      _T.copy(_H).multiply(MX(side * 0.045, 0.165, 0.108));
      M.eyeW.setMatrixAt(i * 2 + k, _T);
      const wob = GK.geek * 0.006;
      _T.copy(_H).multiply(MX(side * 0.045 + Math.sin(t * 3 + p.ph + side) * wob, 0.165 + Math.cos(t * 2.3 + p.ph) * wob, 0.122, 0, 0, 0, P.pupil));
      M.pupil.setMatrixAt(i * 2 + k, _T);
    }
    _T.copy(_H).multiply(MX(0, 0.085, 0.104, 0, 0, 0, 1));
    _T.multiply(new THREE.Matrix4().makeScale(P.grin, 1 + (P.grin - 1) * 0.6, 1));
    M.mouth.setMatrixAt(i, _T);
  });
  for (const m of Object.values(M)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }

  // crowd: fills from the inside out as GK.circle grows, and orbits the fountain
  const frac = GK.circle <= 0 ? 0 : clamp(Math.log10(GK.circle + 1) / Math.log10(40001), 0, 1) ** 2.2;
  const end = smooth(SOBER0, SOBER1, s);
  PEOPLE.crowd.forEach((c, i) => {
    const on = c.order < frac;
    if (!on) { _T.makeScale(0, 0, 0); PEOPLE.cb.setMatrixAt(i, _T); PEOPLE.ch.setMatrixAt(i, _T); PEOPLE.ca.setMatrixAt(i * 2, _T); PEOPLE.ca.setMatrixAt(i * 2 + 1, _T); return; }
    const a = c.a + s * c.spd * (1 - end), b = s * c.bounce + c.ph;
    const x = PLAZA.x + Math.cos(a) * c.r, z = PLAZA.z + Math.sin(a) * c.r * 0.85;
    const hop = Math.abs(Math.sin(b)) * 0.18 * (1 - end);
    _R.compose(_pv.set(x, 0.14 + hop, z), _pq.setFromEuler(_pe.set(0, Math.atan2(PLAZA.x - x, PLAZA.z - z) + Math.sin(b * 0.3) * 0.5, Math.sin(b * 0.5) * 0.12 * (1 - end))), _ps.set(1, 0.95 + c.order * 0.1, 1));
    PEOPLE.cb.setMatrixAt(i, _R); PEOPLE.ch.setMatrixAt(i, _R);
    for (const [k, side] of [[0, -1], [1, 1]]) {
      const up = (2.6 + Math.sin(b + side) * 0.4) * (1 - end) + end * 0.1;
      _T.copy(_R).multiply(MX(side * 0.24, 1.2, 0, 0, 0, side * (Math.PI - up)));
      PEOPLE.ca.setMatrixAt(i * 2 + k, _T);
    }
  });
  for (const m of [PEOPLE.cb, PEOPLE.ch, PEOPLE.ca]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}

function kevinHead(out) {                // for the close-up camera
  const p = PEOPLE.cast[0];
  return out.set(p.tx, 0.15 + 1.62 * p.h, p.tz);
}
window.lifeStats = () => ({ cast: PEOPLE.cast.length, crowd: Math.round(GK.circle) });
