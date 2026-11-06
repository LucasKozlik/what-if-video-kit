'use strict';
// =====================================================================
// PEOPLE — the whole crowd as a handful of InstancedMeshes (one per body
// part), posed every frame from field.js personAt(). Draw calls stay ~8
// no matter how many people there are.
// =====================================================================

const CROWD = {};
function limbGeo(w, h, d) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, -h / 2, 0); return g; }

function buildPeople(scene) {
  const N = PEOPLE.length;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const mk = (geo, n) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m;
  };
  const head = new THREE.SphereGeometry(0.115, 12, 9); head.scale(0.92, 1.1, 1);
  const hair = new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const torso = new THREE.CylinderGeometry(0.2, 0.16, 0.6, 8); torso.scale(1, 1, 0.62);
  CROWD.torso = mk(torso, N);
  CROWD.hips = mk(new THREE.BoxGeometry(0.33, 0.2, 0.21), N);
  CROWD.leg = mk(limbGeo(0.14, 0.86, 0.16), N * 2);
  CROWD.shoe = mk(new THREE.BoxGeometry(0.11, 0.08, 0.27), N * 2);
  CROWD.arm = mk(limbGeo(0.095, 0.6, 0.11), N * 2);
  CROWD.head = mk(head, N);
  CROWD.hair = mk(hair, N);
  CROWD.eye = mk(new THREE.SphereGeometry(0.016, 6, 4), N * 2);
  CROWD.neck = mk(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 6), N);
  CROWD.long = mk(limbGeo(0.27, 0.32, 0.12), N);          // long hair at the back
  CROWD.coat = mk(limbGeo(0.38, 0.55, 0.25), N);          // coat skirt
  const c = new THREE.Color();
  PEOPLE.forEach((p, i) => {
    const top = c.set(p.top).clone(), bot = c.set(p.bottom).clone(), skin = c.set(p.skin).clone(), hr = c.set(p.hair).clone();
    CROWD.torso.setColorAt(i, top); CROWD.hips.setColorAt(i, bot); CROWD.head.setColorAt(i, skin);
    CROWD.hair.setColorAt(i, hr); CROWD.neck.setColorAt(i, skin); CROWD.long.setColorAt(i, hr);
    CROWD.coat.setColorAt(i, top);
    for (let k = 0; k < 2; k++) {
      CROWD.eye.setColorAt(i * 2 + k, c.set('#1a120e'));
      CROWD.leg.setColorAt(i * 2 + k, bot); CROWD.arm.setColorAt(i * 2 + k, p.suit || p.coat ? top : (PRNG() < 0.5 ? top : skin));
      CROWD.shoe.setColorAt(i * 2 + k, c.set(p.suit ? '#0c0c0c' : rpick(['#1a1a1a', '#3a2a1f', '#e8e8e8', '#5a5a5a'], PRNG)));
    }
  });
  for (const k in CROWD) CROWD[k].instanceColor.needsUpdate = true;
}

const _M = new THREE.Matrix4(), _P = new THREE.Matrix4(), _Q = new THREE.Quaternion(),
      _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Euler(), _O = new THREE.Matrix4();
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
function part(mesh, i, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  _T.set(x, y, z); _Q.setFromEuler(_E.set(rx, ry, rz)); _S.set(s, s, s);
  _P.compose(_T, _Q, _S); _O.multiplyMatrices(_M, _P); mesh.setMatrixAt(i, _O);
}

function writePeople(t) {
  const st = storyT(t);
  PEOPLE.forEach((p, i) => {
    personAt(p, st);
    // close-ups: clear the corridor between the lens and the featured person
    let blocked = false;
    const F = DIR.focus;
    if (F && p !== F && p !== BILLIONAIRE) {
      const ax = camera.position.x, az = camera.position.z, bx = F.pos.x, bz = F.pos.z;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const u = clamp(((p.pos.x - ax) * dx + (p.pos.z - az) * dz) / L2, -0.15, 1);
      const ex = ax + dx * u - p.pos.x, ez = az + dz * u - p.pos.z;
      if (u < 0.97 && ex * ex + ez * ez < 0.9 * 0.9) blocked = true;
    }
    p.hidden = blocked;
    if (blocked || !visibleNow(p, st)) {
      for (const k of ['torso', 'hips', 'head', 'hair', 'neck', 'long', 'coat']) CROWD[k].setMatrixAt(i, HIDE);
      for (let s = 0; s < 2; s++) { CROWD.eye.setMatrixAt(i * 2 + s, HIDE); CROWD.leg.setMatrixAt(i * 2 + s, HIDE); CROWD.arm.setMatrixAt(i * 2 + s, HIDE); CROWD.shoe.setMatrixAt(i * 2 + s, HIDE); }
      return;
    }
    const sc = p.h / 1.75, m = p.moving;
    const ph = p.gait, sw = Math.sin(ph) * 0.46 * m, bob = Math.abs(Math.cos(ph)) * 0.035 * m;
    _T.set(p.pos.x, (Math.abs(p.pos.z) >= 7 ? 0.16 : 0) + bob, p.pos.z); _Q.setFromEuler(_E.set(0, p.yaw, 0)); _S.set(sc * p.w, sc, sc * p.w);
    _M.compose(_T, _Q, _S);
    const idle = Math.sin(st * 1.3 + p.phase) * 0.015;
    // under attention the head turns a beat before the body
    part(CROWD.hips, i, 0, 0.9, 0);
    part(CROWD.torso, i, 0, 1.2 + idle * 0.3, 0, 0.04 * m);
    part(CROWD.neck, i, 0, 1.53, 0.0);
    part(CROWD.head, i, 0, 1.64, 0.01, idle);
    part(CROWD.hair, i, 0, 1.665, -0.005, -0.15);
    if (p.long) part(CROWD.long, i, 0, 1.68, -0.07); else CROWD.long.setMatrixAt(i, HIDE);
    if (p.coat) part(CROWD.coat, i, 0, 0.98, 0, 0, 0, 0, 1); else CROWD.coat.setMatrixAt(i, HIDE);
    for (let s = 0; s < 2; s++) {
      const side = s ? 1 : -1, a = side * sw;
      part(CROWD.eye, i * 2 + s, side * 0.042, 1.66, 0.112);
      part(CROWD.leg, i * 2 + s, side * 0.09, 0.86, 0, a);
      // foot at the end of the swinging leg
      part(CROWD.shoe, i * 2 + s, side * 0.09, 0.86 - Math.cos(a) * 0.84, Math.sin(a) * 0.84 + 0.05, 0);
      part(CROWD.arm, i * 2 + s, side * 0.235, 1.46, 0, -a * 0.75, 0, side * 0.06);
    }
  });
  for (const k in CROWD) CROWD[k].instanceMatrix.needsUpdate = true;
}
