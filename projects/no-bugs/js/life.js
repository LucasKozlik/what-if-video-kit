'use strict';
// =====================================================================
// LIFE — bees, butterflies, midge swarms and birds. Every position is a
// pure function of film time, so seeking is exact. Each insect has its own
// vanish moment inside VANISH0..VANISH1, and leaves a rising spark.
// Birds thin out as ECO.birds falls: most songbirds feed insects to chicks.
// =====================================================================

const LIFE = { bees: [], flies: [], birds: [] };
const PU = { uT: { value: 0 }, uScale: { value: 800 } };   // shared Points uniforms

function buildLife(scene) {
  const R = mulberry32(4242);
  buildBees(scene, R);
  buildButterflies(scene, R);
  buildMidges(scene, R);
  buildSparks(scene);
  buildBirds(scene, R);
}

// ---------- bees ----------
function beeGeometry() {
  const body = new THREE.SphereGeometry(0.5, 12, 9); body.rotateX(Math.PI / 2); body.scale(0.42, 0.42, 1);
  const p = body.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i), band = Math.sin((z + 0.5) * 18) > 0.1 && z < 0.3 && z > -0.42;
    const c = z > 0.32 ? [0.09, 0.07, 0.05] : band ? [0.08, 0.06, 0.04] : [0.95, 0.66, 0.12];
    col.push(...c);
  }
  body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const wing = (side) => {
    const g = new THREE.CircleGeometry(0.34, 8); g.scale(0.55, 1, 1); g.rotateX(-Math.PI / 2);
    g.translate(side * 0.28, 0.2, -0.05); g.rotateZ(side * -0.35); return g;
  };
  // mergeGeoms flattens colour per part, so write the body's banded colours back in afterwards.
  const W = new THREE.Color(0.85, 0.9, 0.95);
  const merged = mergeGeoms([{ geo: body }, { geo: wing(1), color: W }, { geo: wing(-1), color: W }]);
  merged.attributes.color.array.set(body.toNonIndexed().attributes.color.array, 0);
  return merged;
}

function buildBees(scene, R) {
  const N = 420, F = WORLD.flowers;
  const heroN = 70;
  for (let i = 0; i < N; i++) {
    const home = i < 150 ? Math.floor(R() * heroN) : heroN + Math.floor(R() * (F.length - heroN));
    const h = F[home];
    // 8 nearest flowers to home — the bee works one patch
    const near = F.map((f, k) => [k, (f.x - h.x) ** 2 + (f.z - h.z) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 8).map(a => a[0]);
    LIFE.bees.push({ near, ph: R() * 10, P: 2.2 + R() * 2.2, tv: insectVanishAt(R()), s: 0.022 * (0.85 + R() * 0.3), seed: R() * 100 });
  }
  LIFE.beeMesh = new THREE.InstancedMesh(beeGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), N);
  LIFE.beeMesh.frustumCulled = false; scene.add(LIFE.beeMesh);
}
const _bA = new THREE.Vector3(), _bB = new THREE.Vector3(), _bP = new THREE.Vector3(), _bQ = new THREE.Vector3();
function beePos(b, t, out) {
  const k = Math.floor((t + b.ph) / b.P), u = (t + b.ph) / b.P - k;
  const fa = WORLD.flowers[b.near[Math.floor(hash1(k * 7.1 + b.seed) * 8)]];
  const fb = WORLD.flowers[b.near[Math.floor(hash1((k + 1) * 7.1 + b.seed) * 8)]];
  flowerHead(fa, 1, _bA); flowerHead(fb, 1, _bB);
  if (u < 0.68) {
    const w = t * 2.3 + b.seed;
    out.set(_bA.x + Math.sin(w) * 0.03, _bA.y + 0.02 + Math.abs(Math.sin(w * 1.7)) * 0.025, _bA.z + Math.cos(w * 1.3) * 0.03);
  } else {
    const e = smooth(0.68, 1, u);
    out.lerpVectors(_bA, _bB, e); out.y += 0.02 + Math.sin(e * Math.PI) * 0.35;
    out.x += Math.sin(t * 13 + b.seed) * 0.02;
  }
  return out;
}
function writeBees(t) {
  const N = LIFE.bees.length;
  for (let i = 0; i < N; i++) {
    const b = LIFE.bees[i];
    if (ECO.s >= b.tv) { _m4.makeScale(0, 0, 0); LIFE.beeMesh.setMatrixAt(i, _m4); continue; }
    beePos(b, t, _bP); beePos(b, t + 0.05, _bQ);
    const dx = _bQ.x - _bP.x, dz = _bQ.z - _bP.z;
    const yaw = Math.hypot(dx, dz) > 1e-4 ? Math.atan2(dx, dz) : b.seed;
    _e3.set(Math.sin(t * 90 + b.seed) * 0.05, yaw, Math.sin(t * 70 + b.seed) * 0.08); _q.setFromEuler(_e3);
    _m4.compose(_bP, _q, _s3.setScalar(b.s)); LIFE.beeMesh.setMatrixAt(i, _m4);
  }
  LIFE.beeMesh.instanceMatrix.needsUpdate = true;
}

// ---------- butterflies ----------
function buildButterflies(scene, R) {
  const N = 80;
  const wing = new THREE.BufferGeometry();
  // fore + hind wing as a fan, hinged on the body axis (x = 0)
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.01, 0.9, 0, 0.55, 1.0, 0, 0.05, 0, 0, -0.02, 1.0, 0, 0.05, 0.7, 0, -0.6, 0, 0, -0.02, 0.7, 0, -0.6, 0.15, 0, -0.5], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
  LIFE.wL = new THREE.InstancedMesh(wing, mat, N);
  LIFE.wR = new THREE.InstancedMesh(wing, mat, N);
  const COLS = ['#e8781a', '#f2f0e6', '#e8781a', '#3a6fd8', '#f4d23a', '#e8781a'];
  for (let i = 0; i < N; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * 36;
    const f = { cx: Math.cos(a) * r, cz: Math.sin(a) * r + 8, ph: R() * 100, tv: insectVanishAt(R()), s: 0.035 + R() * 0.02, sp: 0.4 + R() * 0.4 };
    if (i < 10) { f.cx = WORLD.HERO.x + (R() - 0.5) * 3; f.cz = WORLD.HERO.z + (R() - 0.5) * 3; }
    LIFE.flies.push(f);
    const c = new THREE.Color(COLS[i % COLS.length]);
    LIFE.wL.setColorAt(i, c); LIFE.wR.setColorAt(i, c);
  }
  LIFE.wL.frustumCulled = LIFE.wR.frustumCulled = false;
  scene.add(LIFE.wL); scene.add(LIFE.wR);
}
function flyPos(f, t, out) {
  const w = t * f.sp + f.ph;
  const x = f.cx + noise1(w * 0.5) * 3.5, z = f.cz + noise1(w * 0.5 + 40) * 3.5;
  return out.set(x, groundHeightAt(x, z) + 0.55 + (noise1(w * 1.3 + 9) * 0.5 + 0.5) * 0.9 + Math.sin(t * 5 + f.ph) * 0.05, z);
}
function writeButterflies(t) {
  LIFE.flies.forEach((f, i) => {
    if (ECO.s >= f.tv) { _m4.makeScale(0, 0, 0); LIFE.wL.setMatrixAt(i, _m4); LIFE.wR.setMatrixAt(i, _m4); return; }
    flyPos(f, t, _bP); flyPos(f, t + 0.1, _bQ);
    const yaw = Math.atan2(_bQ.x - _bP.x, _bQ.z - _bP.z);
    const flap = 0.25 + 1.0 * (0.5 + 0.5 * Math.sin(t * 15 + f.ph));
    for (const [im, side] of [[LIFE.wR, 1], [LIFE.wL, -1]]) {
      _e3.set(0, yaw, 0, 'YXZ'); _q.setFromEuler(_e3);
      const qf = new THREE.Quaternion().setFromAxisAngle(_v3.set(0, 0, 1), side * flap);
      _q.multiply(qf);
      _m4.compose(_bP, _q, _s3.set(side * f.s, f.s, f.s)); im.setMatrixAt(i, _m4);
    }
  });
  LIFE.wL.instanceMatrix.needsUpdate = LIFE.wR.instanceMatrix.needsUpdate = true;
}

// ---------- midges: GPU points, whole motion in the vertex shader ----------
const POINT_VS = `
  attribute vec3 aC; attribute vec4 aP; attribute float aTv;
  uniform float uT; uniform float uScale; uniform float uS; varying float vA; varying float vF;
  void main(){
    float age = uS - aTv;
    vec3 p = aC + vec3(sin(uT*aP.w*1.3 + aP.x)*aP.z, sin(uT*aP.w*1.7 + aP.y)*aP.z*0.6, cos(uT*aP.w*1.1 + aP.x*1.3)*aP.z);
    float flash = age > 0.0 ? exp(-age*5.0) : 0.0;
    vA = age > 0.0 ? flash : 1.0; vF = flash;
    p.y += max(age, 0.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.2, 0.012 * (1.0 + 4.0*flash) * uScale / -mv.z);
  }`;
const POINT_FS = `
  uniform vec3 uCol; varying float vA; varying float vF;
  void main(){
    vec2 d = gl_PointCoord - 0.5; float r = dot(d, d);
    if (r > 0.25) discard;
    float a = (1.0 - r * 4.0) * vA;
    gl_FragColor = vec4(mix(uCol, vec3(6.0, 5.2, 3.4), vF), a);
  }`;
function buildMidges(scene, R) {
  const N = 3200, C = new Float32Array(N * 3), P = new Float32Array(N * 4), T = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const sw = Math.floor(i / 80), sr = mulberry32(sw * 97 + 3);
    const a = sr() * 6.28, r = 4 + sr() * 40;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r + 8, cy = groundHeightAt(cx, cz) + 0.8 + sr() * 1.5;
    C.set([cx + (R() - 0.5) * 1.2, cy + (R() - 0.5) * 0.8, cz + (R() - 0.5) * 1.2], i * 3);
    P.set([R() * 6.28, R() * 6.28, 0.15 + R() * 0.35, 1.5 + R() * 2.5], i * 4);
    T[i] = insectVanishAt(R());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aC', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aP', new THREE.BufferAttribute(P, 4));
  g.setAttribute('aTv', new THREE.BufferAttribute(T, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: PU.uT, uScale: PU.uScale, uS: { value: 0 }, uCol: { value: new THREE.Color(1.6, 1.45, 1.1) } },
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
  });
  LIFE.midges = new THREE.Points(g, m); LIFE.midges.frustumCulled = false; scene.add(LIFE.midges);
}

// One spark per bee and butterfly, born where it was at the moment it vanished.
function buildSparks(scene) {
  const list = [];
  for (const b of LIFE.bees) list.push([beePos(b, b.tv, new THREE.Vector3()), b.tv]);
  for (const f of LIFE.flies) list.push([flyPos(f, f.tv, new THREE.Vector3()), f.tv]);
  const N = list.length, C = new Float32Array(N * 3), P = new Float32Array(N * 4), T = new Float32Array(N);
  list.forEach(([p, tv], i) => { C.set([p.x, p.y, p.z], i * 3); P.set([i, i * 1.7, 0.02, 2], i * 4); T[i] = tv; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aC', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aP', new THREE.BufferAttribute(P, 4));
  g.setAttribute('aTv', new THREE.BufferAttribute(T, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: PU.uT, uScale: PU.uScale, uS: { value: 0 }, uCol: { value: new THREE.Color(9, 7.5, 4.5) } },
    vertexShader: POINT_VS.replace('vA = age > 0.0 ? flash : 1.0;', 'vA = age > 0.0 ? flash : 0.0;')
                          .replace('0.012 * (1.0 + 4.0*flash)', '0.05 * (0.4 + 2.6*flash)'),
    fragmentShader: POINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  LIFE.sparks = new THREE.Points(g, m); LIFE.sparks.frustumCulled = false; scene.add(LIFE.sparks);
}

// ---------- birds: swallows over the meadow, songbirds around the orchard ----------
function buildBirds(scene, R) {
  const N = 40;
  const body = new THREE.ConeGeometry(0.06, 0.32, 6); body.rotateX(Math.PI / 2);
  const tail = new THREE.ConeGeometry(0.05, 0.14, 3); tail.rotateX(-Math.PI / 2); tail.translate(0, 0, -0.2); tail.scale(1.6, 0.3, 1);
  const bodyG = mergeGeoms([{ geo: body, color: new THREE.Color('#1c2230') }, { geo: tail, color: new THREE.Color('#1c2230') }]);
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.06, 0.32, 0, -0.05, 0, 0, -0.07, 0.32, 0, -0.05, 0.05, 0, -0.06, 0, 0, -0.07], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#1c2230', roughness: 0.7, side: THREE.DoubleSide });
  LIFE.birdBody = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), N);
  LIFE.birdWL = new THREE.InstancedMesh(wing, mat, N);
  LIFE.birdWR = new THREE.InstancedMesh(wing, mat, N);
  for (let i = 0; i < N; i++) {
    const swallow = i < 22;
    LIFE.birds.push(swallow
      ? { cx: rr(-15, 15, R), cz: rr(0, 25, R), r: rr(6, 16, R), h: rr(1.2, 5, R), w: rr(0.5, 0.9, R) * (R() < 0.5 ? -1 : 1), ph: R() * 6.28, thr: R(), s: 1.1, swallow }
      : { cx: rr(-45, -25, R), cz: rr(-35, -15, R), r: rr(5, 14, R), h: rr(6, 12, R), w: rr(0.25, 0.5, R) * (R() < 0.5 ? -1 : 1), ph: R() * 6.28, thr: R(), s: 1.0, swallow });
  }
  for (const im of [LIFE.birdBody, LIFE.birdWL, LIFE.birdWR]) { im.frustumCulled = false; scene.add(im); }
}
function birdPos(b, t, out) {
  const a = b.ph + t * b.w;
  const x = b.cx + Math.cos(a) * b.r + Math.sin(a * 2.3) * b.r * 0.25, z = b.cz + Math.sin(a) * b.r;
  return out.set(x, groundHeightAt(x, z) + b.h + Math.sin(a * 3.1 + b.ph) * (b.swallow ? 1.0 : 0.6), z);
}
function writeBirds(t) {
  LIFE.birds.forEach((b, i) => {
    if (b.thr > ECO.birds) {
      _m4.makeScale(0, 0, 0);
      LIFE.birdBody.setMatrixAt(i, _m4); LIFE.birdWL.setMatrixAt(i, _m4); LIFE.birdWR.setMatrixAt(i, _m4); return;
    }
    birdPos(b, t, _bP); birdPos(b, t + 0.05, _bQ);
    const dx = _bQ.x - _bP.x, dy = _bQ.y - _bP.y, dz = _bQ.z - _bP.z;
    const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    _e3.set(pitch, yaw, -Math.sign(b.w) * 0.5, 'YXZ'); _q.setFromEuler(_e3);
    _m4.compose(_bP, _q, _s3.setScalar(b.s)); LIFE.birdBody.setMatrixAt(i, _m4);
    const flapT = b.swallow ? 9 : 14, glide = b.swallow ? smooth(0.2, 0.6, Math.sin(t * 0.9 + b.ph)) : 0;
    const flap = lerp(Math.sin(t * flapT + b.ph) * 0.8, 0.08, glide);
    for (const [im, side] of [[LIFE.birdWR, 1], [LIFE.birdWL, -1]]) {
      const q2 = _q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(_v3.set(0, 0, 1), side * flap));
      _m4.compose(_bP, q2, _s3.set(side * b.s, b.s, b.s)); im.setMatrixAt(i, _m4);
    }
  });
  for (const im of [LIFE.birdBody, LIFE.birdWL, LIFE.birdWR]) im.instanceMatrix.needsUpdate = true;
}

function writeLife(t) {
  PU.uT.value = t;
  LIFE.midges.material.uniforms.uS.value = ECO.s;
  LIFE.sparks.material.uniforms.uS.value = ECO.s;
  // the cold open shows the aftermath: no sparks, no midges
  LIFE.sparks.visible = ECO.s < VANISH1 + 1.5;
  LIFE.midges.visible = ECO.s < VANISH1 + 1.5;
  writeBees(t);
  writeButterflies(t);
  writeBirds(t);
}

window.lifeStats = () => ({
  bees: LIFE.bees.filter(b => ECO.s < b.tv).length,
  birds: LIFE.birds.filter(b => b.thr <= ECO.birds).length,
});
