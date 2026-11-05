'use strict';
// =====================================================================
// WORLD — a late-summer meadow, an orchard, a wheat field and a farm.
// Nothing here is destroyed. It fades: flowers wilt, the meadow browns,
// the orchard blooms without fruit, and litter piles up because nothing
// eats it. Every change is a function of ECO (field.js).
// =====================================================================

const WORLD = { flowers: [], litterN: 0, total: 0 };
const U = { time: { value: 0 }, green: { value: 1 }, haze: { value: 0 } };   // shared uniforms

// ---- terrain ----
function vhash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = vhash(ix, iz), b = vhash(ix + 1, iz), c = vhash(ix, iz + 1), d = vhash(ix + 1, iz + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz) * 2 - 1;
}
function groundHeightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = vnoise(x / 60, z / 60) * 1.4 + vnoise(x / 23 + 7, z / 23) * 0.35;
  h += smooth(130, 420, r) * (18 + vnoise(x / 140 + 3, z / 140) * 22);      // hills ringing the valley
  return h;
}

// ---- inject a vitality tint into a standard material ----
// green -> straw brown, patchy, driven by U.green. Optional wind sway on instanced plants.
function plantMaterial(opts = {}) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }, opts.std || {}));
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.time; sh.uniforms.uGreen = U.green;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uGreen; varying float vPatch; varying float vH;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vH = position.y;
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = floor(position / 5.0) * 5.0;
        #endif
        vPatch = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float sway = ${(opts.sway || 0).toFixed(3)} * max(position.y, 0.0);
        float ph = ip.x * 0.21 + ip.z * 0.17;
        transformed.x += sway * (sin(uTime * 1.7 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.7) * 0.25);
        transformed.z += sway * cos(uTime * 1.3 + ph) * 0.35;
        transformed.y -= ${(opts.droop || 0).toFixed(3)} * (1.0 - uGreen) * vPatch * max(position.y, 0.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uGreen; varying float vPatch; varying float vH;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${opts.noTint ? '' : `
        float dead = clamp((1.0 - uGreen) * 1.35 - vPatch * 0.35, 0.0, 1.0);
        vec3 straw = vec3(0.36, 0.24, 0.10) * (0.7 + 0.6 * vPatch);
        float l = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
        diffuseColor.rgb = mix(diffuseColor.rgb, straw * (0.6 + l * 1.6), dead);`}`);
  };
  m.customProgramCacheKey = () => 'plant' + JSON.stringify(opts);
  return m;
}

function buildWorld(scene) {
  WORLD.scene = scene;
  buildGround(scene);
  buildGrass(scene);
  buildFlowers(scene);
  buildOrchard(scene);
  buildWheat(scene);
  buildFarm(scene);
  buildTreeline(scene);
  buildCows(scene);
  buildLitter(scene);
}

function buildGround(scene) {
  const tex = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#7f8f55', 0.22, 5);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsla(${70 + RNG() * 40},${30 + RNG() * 30}%,${25 + RNG() * 25}%,0.55)`;
      g.fillRect(RNG() * w, RNG() * h, 1.2, 3 + RNG() * 5);
    }
  }, { repeat: true });
  tex.repeat.set(260, 260);
  const N = 220, S = 1800;
  const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  // Denser resolution where it matters: warp the grid toward the centre.
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z) / (S / 2), k = Math.pow(r, 1.8) / Math.max(r, 1e-6);
    x *= k; z *= k; p.setXYZ(i, x, groundHeightAt(x, z), z);
  }
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), n = vnoise(x / 9, z / 9) * 0.5 + 0.5;
    let c = [0.52 + n * 0.18, 0.68 + n * 0.12, 0.40];
    // dirt track from the meadow to the farm
    const tx = x - (Math.sin(z / 22) * 4 - 6), onPath = 1 - smooth(1.1, 2.4, Math.abs(tx));
    if (z < 20 && z > -64) c = c.map((v, k) => lerp(v, [0.62, 0.52, 0.40][k] * 1.25, onPath));
    col.set(c, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = plantMaterial({ std: { map: tex, side: THREE.FrontSide } });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true; scene.add(ground);
}

// A tuft: five tapered blades, base dark, tip light.
function tuftGeometry() {
  const parts = [];
  for (let b = 0; b < 5; b++) {
    const g = new THREE.BufferGeometry();
    const h = 0.28 + RNG() * 0.22, w = 0.018, lean = (RNG() - 0.5) * 0.25;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, lean + w * 0.3, h * 0.6, 0.02, lean + w * 0.3, h * 0.6, 0.02, -w * 0.6 + lean, h * 0.6, 0.02, lean * 1.6, h, 0.06], 3));
    g.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 5]);
    g.computeVertexNormals();
    const c = hslC(0.22 + RNG() * 0.06, 0.5, 0.32 + RNG() * 0.12);
    parts.push({ geo: g, color: c, matrix: M4(0, 0, 0, 0, b * 1.26 + RNG() * 0.5, 0) });
  }
  const geo = mergeGeoms(parts);
  // darken the base
  const p = geo.attributes.position, c = geo.attributes.color;
  for (let i = 0; i < p.count; i++) { const k = 0.45 + 0.55 * clamp(p.getY(i) / 0.4, 0, 1); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
  return geo;
}

function buildGrass(scene) {
  const geo = tuftGeometry(), N = 14000;
  const mesh = new THREE.InstancedMesh(geo, plantMaterial({ sway: 0.18, droop: 0.5 }), N);
  const m = new THREE.Matrix4();
  let n = 0;
  while (n < N) {
    // dense near the meadow, thinning out to 110 m
    const r = 2 + Math.pow(RNG(), 1.6) * 105, a = RNG() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r + 6;
    if (x > 16 && x < 62 && z > -47 && z < -10) continue;            // wheat field
    const tx = x - (Math.sin(z / 22) * 4 - 6);
    if (Math.abs(tx) < 1.6 && z < 20 && z > -64) continue;            // dirt track
    const dh = Math.hypot(x - 1.5, z - 9);
    if (dh < 1.2 && RNG() < 0.7) continue;
    const s = (0.5 + RNG() * 0.6) * (0.45 + 0.55 * smooth(1.0, 4.0, dh));
    m.copy(M4(x, groundHeightAt(x, z) - 0.02, z, 0, RNG() * 6.28, 0, s, s * (0.7 + RNG() * 0.5), s));
    mesh.setMatrixAt(n++, m);
  }
  mesh.frustumCulled = false; mesh.receiveShadow = true;
  scene.add(mesh);
}

// ---- wildflowers ----
const FLOWER_TYPES = [
  { petal: '#f4f1e8', center: '#e8b21a', n: 13, len: 0.05, wid: 0.012, h: [0.32, 0.5] },   // oxeye daisy
  { petal: '#d8261a', center: '#1d1410', n: 5, len: 0.04, wid: 0.034, h: [0.4, 0.6] },     // poppy
  { petal: '#3d63d8', center: '#2a2c6a', n: 8, len: 0.03, wid: 0.012, h: [0.35, 0.55] },    // cornflower
  { petal: '#f6cf16', center: '#c99a0c', n: 5, len: 0.02, wid: 0.016, h: [0.25, 0.42] },    // buttercup
  { petal: '#b05ad0', center: '#7a3a90', n: 10, len: 0.025, wid: 0.01, h: [0.25, 0.4] },    // knapweed / clover
];
function petalHead(type) {
  const parts = [];
  for (let k = 0; k < type.n; k++) {
    const a = k / type.n * Math.PI * 2;
    const g = new THREE.CircleGeometry(0.5, 10); g.scale(type.wid * 1.15, type.len, 1); g.rotateX(-Math.PI / 2 + 0.3); g.translate(0, 0.004, type.len * 0.5);
    parts.push({ geo: g, color: new THREE.Color(1, 1, 1), matrix: M4(0, 0, 0, 0, a, 0) });
  }
  return mergeGeoms(parts);
}
function buildFlowers(scene) {
  const N = 3600;
  const stemGeo = new THREE.CylinderGeometry(0.0022, 0.0035, 1, 5, 1, true); stemGeo.translate(0, 0.5, 0);
  WORLD.stems = new THREE.InstancedMesh(stemGeo, plantMaterial({ sway: 0.15, std: { color: '#5d8a33', vertexColors: false } }), N);
  const centerGeo = new THREE.SphereGeometry(0.013, 10, 6); centerGeo.scale(1, 0.6, 1);
  WORLD.centers = new THREE.InstancedMesh(centerGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), N);
  WORLD.heads = [];
  const headMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, vertexColors: false });
  const perType = FLOWER_TYPES.map(ty => ({ ty, geo: petalHead(ty), list: [] }));

  const add = (x, z, ti, hero) => {
    const ty = FLOWER_TYPES[ti], h = rr(ty.h[0], ty.h[1]);
    const f = {
      x, z, y: groundHeightAt(x, z), h, ti, yaw: RNG() * 6.28, tilt: RNG() * 0.3,
      thr: hero ? 0.25 + RNG() * 0.1 : RNG(), s: hero ? 1.35 + RNG() * 0.3 : 0.85 + RNG() * 0.5,
      idx: WORLD.flowers.length,
    };
    f.slot = perType[ti].list.length; perType[ti].list.push(f);
    WORLD.flowers.push(f);
  };
  // Hero clump for the close-ups, then drifts of each species (flowers grow in patches).
  WORLD.HERO = V3(1.5, 0, 9);
  add(WORLD.HERO.x, WORLD.HERO.z, 0, true);
  WORLD.flowers[0].thr = 0.3; WORLD.flowers[0].yaw = 2.6; WORLD.flowers[0].tilt = 0.25;
  for (let i = 1; i < 70; i++) {
    const a = RNG() * 6.28, r = 0.25 + Math.sqrt(RNG()) * 1.8;
    const x = WORLD.HERO.x + Math.cos(a) * r, z = WORLD.HERO.z + Math.sin(a) * r;
    // keep the lens corridor (camera sits toward -x,+z of the hero) clear
    const cx = x - WORLD.HERO.x, cz = z - WORLD.HERO.z;
    if (cz > 0 && cx < 0 && Math.abs(cx * 0.8 + cz * 0.6) > 0 && (-cx * 0.6 + cz * 0.8) < 0.9 && Math.abs(cx * 0.8 + cz * 0.6) < 0.35) continue;
    add(x, z, i % 3 === 0 ? 1 : (i % 3 === 1 ? 0 : 2), true);
  }
  WORLD.HERO.y = groundHeightAt(WORLD.HERO.x, WORLD.HERO.z);
  let guard = 0;
  while (WORLD.flowers.length < N && guard++ < 100000) {
    const pa = RNG() * 6.28, pr = 3 + Math.pow(RNG(), 0.9) * 46;
    const cx = Math.cos(pa) * pr, cz = Math.sin(pa) * pr + 8, ti = Math.floor(RNG() * FLOWER_TYPES.length);
    const count = 15 + Math.floor(RNG() * 40);
    for (let i = 0; i < count && WORLD.flowers.length < N; i++) {
      const a = RNG() * 6.28, r = Math.sqrt(RNG()) * 3.5, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (x > 16 && x < 62 && z > -47 && z < -10) continue;
      if (Math.abs(x - (Math.sin(z / 22) * 4 - 6)) < 1.8 && z < 20) continue;
      add(x, z, ti, false);
    }
  }
  for (const pt of perType) {
    const m = new THREE.InstancedMesh(pt.geo, headMat, pt.list.length);
    m.frustumCulled = false; m.castShadow = false;
    pt.mesh = m; WORLD.heads.push(pt); scene.add(m);
  }
  WORLD.stems.count = WORLD.centers.count = WORLD.flowers.length;
  WORLD.stems.frustumCulled = WORLD.centers.frustumCulled = false;
  scene.add(WORLD.stems); scene.add(WORLD.centers);
  WORLD.flowerV = -1;
  writeFlowers(1);
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e3 = new THREE.Euler(), _v3 = new THREE.Vector3(),
      _s3 = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();
const BROWN = new THREE.Color('#4a3420'), DRYSTEM = new THREE.Color('#6b5534');
// Health of flower f at vitality v: 1 = in bloom, 0 = dead.
const flowerHealth = (f, v) => smooth(f.thr * 0.9 - 0.12, f.thr * 0.9 + 0.08, v);
// Head position (top of stem, drooping as it dies). Also used by the bees.
function flowerHead(f, v, out) {
  const hl = flowerHealth(f, v), droop = (1 - hl) * 1.25;
  const H = f.h * f.s * (0.55 + 0.45 * hl);
  return out.set(f.x + Math.sin(f.yaw) * droop * 0.06, f.y + H * (1 - droop * 0.12), f.z + Math.cos(f.yaw) * droop * 0.06);
}
function writeFlowers(v) {
  if (Math.abs(v - WORLD.flowerV) < 0.002) return;
  WORLD.flowerV = v;
  for (const f of WORLD.flowers) {
    const hl = flowerHealth(f, v), H = f.h * f.s * (0.55 + 0.45 * hl);
    const gone = v < f.thr * 0.9 - 0.3;                 // long dead: collapsed into the litter
    _e3.set(f.tilt * hl + (1 - hl) * 0.5, f.yaw, 0);
    _q.setFromEuler(_e3);
    _m4.compose(_v3.set(f.x, f.y, f.z), _q, _s3.set(1, gone ? 0.15 : H, 1));
    WORLD.stems.setMatrixAt(f.idx, _m4);
    _c.set('#5d8a33').lerp(DRYSTEM, 1 - hl);
    WORLD.stems.setColorAt(f.idx, _c);

    flowerHead(f, v, _v3);
    const droop = (1 - hl) * 1.9;
    _e3.set(f.tilt + droop, f.yaw, 0); _q.setFromEuler(_e3);
    const ps = f.s * (gone ? 0 : 0.35 + 0.65 * hl);
    _m4.compose(_v3, _q, _s3.set(ps * (0.6 + 0.4 * hl), ps, ps));
    const pt = WORLD.heads[f.ti];
    pt.mesh.setMatrixAt(f.slot, _m4);
    _c.set(FLOWER_TYPES[f.ti].petal).lerp(BROWN, 1 - hl);
    pt.mesh.setColorAt(f.slot, _c);
    _m4.compose(_v3, _q, _s3.set(f.s * (gone ? 0 : 1), f.s, f.s));
    WORLD.centers.setMatrixAt(f.idx, _m4);
    _c.set(FLOWER_TYPES[f.ti].center).lerp(BROWN, (1 - hl) * 0.8);
    WORLD.centers.setColorAt(f.idx, _c);
  }
  for (const im of [WORLD.stems, WORLD.centers, ...WORLD.heads.map(p => p.mesh)]) {
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
}

// ---- orchard ----
function buildOrchard(scene) {
  const trunkParts = [], canopyParts = [], appleM = [], blossomM = [], petalM = [];
  WORLD.orchard = [];
  const BARK = new THREE.Color('#4a3a2c');
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) {
    const x = -52 + k * 7 + rr(-0.6, 0.6), z = -38 + row * 8 + rr(-0.6, 0.6), y = groundHeightAt(x, z);
    WORLD.orchard.push(V3(x, y, z));
    trunkParts.push({ geo: new THREE.CylinderGeometry(0.13, 0.2, 1.7, 7), color: BARK, matrix: M4(x, y + 0.85, z) });
    for (let b = 0; b < 4; b++) {
      const a = b * 1.57 + RNG() * 0.6;
      trunkParts.push({ geo: new THREE.CylinderGeometry(0.05, 0.09, 1.5, 5), color: BARK,
        matrix: M4(x + Math.cos(a) * 0.4, y + 2.1, z + Math.sin(a) * 0.4, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7) });
    }
    const cy = y + 3.0;
    for (let b = 0; b < 9; b++) {
      const a = RNG() * 6.28, r = RNG() * 1.1, s = 0.9 + RNG() * 0.7;
      const g = new THREE.IcosahedronGeometry(1, 1);
      const pp = g.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const j = 0.82 + 0.36 * vhash(Math.round(pp.getX(i) * 50) + b, Math.round(pp.getY(i) * 50 + pp.getZ(i) * 31) + k * 7);
        pp.setXYZ(i, pp.getX(i) * j, pp.getY(i) * j, pp.getZ(i) * j);
      }
      g.computeVertexNormals();
      canopyParts.push({ geo: g, color: hslC(0.25 + RNG() * 0.04, 0.42, 0.24 + RNG() * 0.08),
        matrix: M4(x + Math.cos(a) * r, cy + (RNG() - 0.3) * 0.8, z + Math.sin(a) * r, 0, RNG() * 6, 0, s * 1.1, s * 0.85, s * 1.1) });
    }
    // fruit and blossom sit on the canopy surface
    for (let i = 0; i < 160; i++) {
      const th = RNG() * 6.28, ph = Math.acos(rr(-0.6, 0.95)), R = 2.15 + RNG() * 0.3;
      const px = x + Math.sin(ph) * Math.cos(th) * R, py = cy + Math.cos(ph) * R * 0.85, pz = z + Math.sin(ph) * Math.sin(th) * R;
      if (i < 34) appleM.push(M4(px, py - 0.1, pz, 0, 0, 0, 1, 1, 1));
      blossomM.push(M4(px, py, pz, RNG() * 3, RNG() * 3, 0, 1, 1, 1));
      const fr = RNG() * 2.6 + 0.3, fa = RNG() * 6.28;
      const fx = x + Math.cos(fa) * fr, fz = z + Math.sin(fa) * fr;
      petalM.push(M4(fx, groundHeightAt(fx, fz) + 0.02, fz, 0, RNG() * 6, 0, 1, 1, 1));
    }
  }
  const trunks = new THREE.Mesh(mergeGeoms(trunkParts), stdMat('#ffffff', { vertexColors: true, roughness: 0.95 }));
  trunks.castShadow = trunks.receiveShadow = true; scene.add(trunks);
  const canopy = new THREE.Mesh(mergeGeoms(canopyParts), plantMaterial({ std: { flatShading: true, side: THREE.FrontSide } }));
  canopy.castShadow = canopy.receiveShadow = true; scene.add(canopy);
  WORLD.canopy = canopy;

  const mk = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; scene.add(im);
    im.userData.base = list; return im;
  };
  WORLD.apples = mk(new THREE.SphereGeometry(0.075, 8, 6), stdMat('#b8231c', { roughness: 0.45 }), appleM);
  WORLD.blossom = mk(new THREE.IcosahedronGeometry(0.065, 0), stdMat('#f9d2de', { roughness: 0.7, flatShading: true }), blossomM);
  const pg = new THREE.CircleGeometry(0.03, 5); pg.rotateX(-Math.PI / 2);
  WORLD.petals = mk(pg, stdMat('#f3dfe4', { roughness: 0.8 }), petalM);
  WORLD.orchardState = '';
}

function writeOrchard() {
  const key = ECO.apples.toFixed(3) + ECO.blossom.toFixed(3);
  if (key === WORLD.orchardState) return;
  WORLD.orchardState = key;
  const scaleList = (im, f) => {
    im.userData.base.forEach((b, i) => {
      const s = f(i);
      b.decompose(_v3, _q, _s3); _m4.compose(_v3, _q, _s3.setScalar(s)); im.setMatrixAt(i, _m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  scaleList(WORLD.apples, i => ECO.apples > 0.5 ? 1 : 0);
  scaleList(WORLD.blossom, i => smooth(hash1(i) * 0.6, hash1(i) * 0.6 + 0.4, ECO.blossom));
  // blossom that has fallen without being pollinated carpets the ground beneath
  const fallen = ECO.s > 33 ? clamp(1 - ECO.blossom, 0, 1) * (1 - smooth(44, 52, ECO.s)) : 0;
  scaleList(WORLD.petals, i => hash1(i + 0.5) < fallen ? 1 : 0);
}

// ---- wheat (wind-pollinated: it survives) ----
function buildWheat(scene) {
  const parts = [];
  const stalk = new THREE.CylinderGeometry(0.004, 0.006, 0.95, 3, 1, true); stalk.translate(0, 0.475, 0);
  parts.push({ geo: stalk, color: new THREE.Color('#b59a52') });
  const head = new THREE.SphereGeometry(0.018, 5, 4); head.scale(1, 4.2, 1); head.translate(0, 1.0, 0);
  parts.push({ geo: head, color: new THREE.Color('#d6b260') });
  const geo = mergeGeoms(parts);
  const N = 16000, im = new THREE.InstancedMesh(geo, plantMaterial({ sway: 0.2, noTint: true }), N);
  for (let i = 0; i < N; i++) {
    const x = rr(17, 61), z = rr(-46, -11), s = 0.85 + RNG() * 0.3;
    im.setMatrixAt(i, M4(x, groundHeightAt(x, z), z, rr(-0.08, 0.08), RNG() * 6, rr(-0.08, 0.08), s, s, s));
  }
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true;
  scene.add(im);
  // a soil bed under it so gaps don't show meadow grass
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(44, 35, 22, 18).rotateX(-Math.PI / 2), stdMat('#7a6440', { roughness: 1 }));
  const bp = bed.geometry.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i) + 39, z = bp.getZ(i) - 28.5; bp.setY(i, groundHeightAt(x, z) + 0.03); }
  bed.position.set(39, 0, -28.5); bed.geometry.computeVertexNormals(); bed.receiveShadow = true; scene.add(bed);
}

// ---- farm ----
function buildFarm(scene) {
  const parts = [];
  const add = (geo, color, m) => parts.push({ geo, color: new THREE.Color(color), matrix: m });
  const fy = groundHeightAt(4, -62);
  add(new THREE.BoxGeometry(10, 5.2, 7), '#c9bfae', M4(4, fy + 2.6, -62));
  const roof = new THREE.CylinderGeometry(0.01, 6.2, 3.0, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.15, 1, 0.82);
  add(roof, '#4a3b34', M4(4, fy + 6.7, -62));
  add(new THREE.BoxGeometry(0.9, 2.4, 0.9), '#6b5f58', M4(6.5, fy + 7.4, -63));
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.1, 1.3, 0.1), '#2d3540', M4(0.8 + i * 3.2, fy + 3.2, -58.45));
  add(new THREE.BoxGeometry(1.1, 2.1, 0.1), '#5a3a2a', M4(4, fy + 1.05, -58.45));
  const by = groundHeightAt(32, -66);
  add(new THREE.BoxGeometry(12, 7, 16), '#8e2b22', M4(32, by + 3.5, -66));
  add(new THREE.BoxGeometry(13, 0.4, 16.6), '#3c3c3e', M4(32, by + 7.2, -66));
  add(new THREE.CylinderGeometry(0.2, 7.0, 4, 4), '#3c3c3e', M4(32, by + 9.2, -66, 0, Math.PI / 4, 0, 0.95, 1, 1.6));
  add(new THREE.BoxGeometry(5, 5, 0.2), '#e8e0d0', M4(32, by + 2.5, -57.9));
  add(new THREE.CylinderGeometry(2.4, 2.4, 13, 14), '#a7aeb4', M4(42, by + 6.5, -70));
  add(new THREE.SphereGeometry(2.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8b9298', M4(42, by + 13, -70));
  // fence along the track
  for (let z = 18; z > -56; z -= 3.2) {
    const x = Math.sin(z / 22) * 4 - 9.2, y = groundHeightAt(x, z);
    add(new THREE.BoxGeometry(0.12, 1.2, 0.12), '#7a6a58', M4(x, y + 0.6, z));
    add(new THREE.BoxGeometry(0.06, 0.1, 3.3), '#8a7a66', M4(x, y + 0.95, z - 1.6, 0.0, -Math.cos(z / 22) * 4 / 22, 0));
    add(new THREE.BoxGeometry(0.06, 0.1, 3.3), '#8a7a66', M4(x, y + 0.5, z - 1.6, 0.0, -Math.cos(z / 22) * 4 / 22, 0));
  }
  const farm = new THREE.Mesh(mergeGeoms(parts), stdMat('#ffffff', { vertexColors: true, roughness: 0.8 }));
  farm.castShadow = farm.receiveShadow = true; scene.add(farm);
}

// ---- distant woods ----
function buildTreeline(scene) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pp = g.attributes.position;
  for (let i = 0; i < pp.count; i++) { const j = 0.85 + 0.3 * vhash(Math.round(pp.getX(i) * 40), Math.round(pp.getY(i) * 40 + pp.getZ(i) * 17)); pp.setXYZ(i, pp.getX(i) * j, pp.getY(i) * j * 1.25, pp.getZ(i) * j); }
  g.computeVertexNormals();
  const col = new Float32Array(pp.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const N = 900, im = new THREE.InstancedMesh(g, plantMaterial({ std: { flatShading: true, side: THREE.FrontSide } }), N);
  for (let i = 0; i < N; i++) {
    const a = RNG() * 6.28, r = 95 + Math.pow(RNG(), 0.7) * 260;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 40 && Math.abs(x) < 120) { i--; continue; }           // keep the view behind the cameras open-ish
    const s = 3 + RNG() * 4;
    im.setMatrixAt(i, M4(x, groundHeightAt(x, z) + s * 0.9, z, 0, RNG() * 6, 0, s, s, s));
    im.setColorAt(i, hslC(0.24 + RNG() * 0.06, 0.4, 0.18 + RNG() * 0.08, _c));
  }
  im.frustumCulled = false; im.castShadow = false; scene.add(im);
  // hedgerow trees near the meadow edge
  const M = 26, hm = new THREE.InstancedMesh(g, plantMaterial({ std: { flatShading: true, side: THREE.FrontSide } }), M);
  for (let i = 0; i < M; i++) {
    const x = -70 + i * 6 + rr(-2, 2), z = -84 + rr(-4, 4), s = 3.5 + RNG() * 2.5;
    hm.setMatrixAt(i, M4(x, groundHeightAt(x, z) + s, z, 0, RNG() * 6, 0, s, s, s));
    hm.setColorAt(i, hslC(0.25, 0.42, 0.2 + RNG() * 0.06, _c));
  }
  hm.castShadow = true; hm.frustumCulled = false; scene.add(hm);
}

// ---- cattle (their dung is part of the story) ----
function buildCows(scene) {
  const parts = [];
  const hide = new THREE.Color('#5a3d2b'), dark = new THREE.Color('#2a1f18'), muzzle = new THREE.Color('#c9a99a');
  WORLD.cows = [];
  const spots = [[-20, 30], [-27, 36], [-15, 40], [-33, 28], [-22, 47]];
  for (const [x, z] of spots) {
    const y = groundHeightAt(x, z), yaw = RNG() * 6.28;
    WORLD.cows.push(V3(x, y, z));
    const R = M4(x, y, z, 0, yaw, 0);
    const P = (geo, color, m) => parts.push({ geo, color, matrix: R.clone().multiply(m) });
    P(new THREE.BoxGeometry(0.75, 0.7, 1.7), hide, M4(0, 1.05, 0));
    P(new THREE.BoxGeometry(0.4, 0.45, 0.55), hide, M4(0, 0.85, 1.05, 0.6, 0, 0));
    P(new THREE.BoxGeometry(0.3, 0.2, 0.2), muzzle, M4(0, 0.58, 1.3, 0.6, 0, 0));
    for (const [lx, lz] of [[-0.25, 0.65], [0.25, 0.65], [-0.25, -0.65], [0.25, -0.65]])
      P(new THREE.BoxGeometry(0.14, 0.75, 0.14), dark, M4(lx, 0.37, lz));
    P(new THREE.BoxGeometry(0.05, 0.6, 0.05), dark, M4(0, 0.85, -0.88, 0.25, 0, 0));
  }
  const cows = new THREE.Mesh(mergeGeoms(parts), stdMat('#ffffff', { vertexColors: true, roughness: 0.9 }));
  cows.castShadow = cows.receiveShadow = true; scene.add(cows);
}

// ---- litter: dead leaves, dung pats, fallen fruit. Nothing is eating it. ----
function buildLitter(scene) {
  const leafG = new THREE.CircleGeometry(0.05, 5); leafG.rotateX(-Math.PI / 2); leafG.scale(1, 1, 1.8);
  const N = 7000, leaves = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide }), N);
  const base = [];
  for (let i = 0; i < N; i++) {
    const r = 1 + Math.pow(RNG(), 1.3) * 45, a = RNG() * 6.28;
    const x = Math.cos(a) * r, z = Math.sin(a) * r + 8, s = 0.8 + RNG() * 1.4;
    base.push({ m: M4(x, groundHeightAt(x, z) + 0.03, z, rr(-0.3, 0.3), RNG() * 6, rr(-0.3, 0.3), s, s, s), thr: RNG() });
    leaves.setColorAt(i, hslC(0.06 + RNG() * 0.06, 0.45 + RNG() * 0.2, 0.18 + RNG() * 0.14, _c));
  }
  leaves.frustumCulled = false; leaves.receiveShadow = true; scene.add(leaves);
  WORLD.leaves = { im: leaves, base };

  const dungG = new THREE.SphereGeometry(0.22, 9, 5, 0, 6.29, 0, Math.PI / 2); dungG.scale(1, 0.32, 1);
  const M = 420, dung = new THREE.InstancedMesh(dungG, stdMat('#3a2b1c', { roughness: 0.7 }), M);
  const dbase = [];
  for (let i = 0; i < M; i++) {
    const c = WORLD.cows[i % WORLD.cows.length], r = 0.8 + Math.pow(RNG(), 0.7) * 14, a = RNG() * 6.28;
    const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, s = 0.7 + RNG() * 0.8;
    dbase.push({ m: M4(x, groundHeightAt(x, z) + 0.01, z, 0, RNG() * 6, 0, s, s, s), thr: RNG() });
  }
  dung.frustumCulled = false; dung.castShadow = true; scene.add(dung);
  WORLD.dung = { im: dung, base: dbase };
  WORLD.litterV = -1;
}
function writeLitter(v) {
  if (Math.abs(v - WORLD.litterV) < 0.003) return;
  WORLD.litterV = v;
  let n = 0;
  for (const L of [WORLD.leaves, WORLD.dung]) {
    L.base.forEach((b, i) => {
      const k = smooth(b.thr - 0.05, b.thr + 0.05, v * 1.1);
      b.m.decompose(_v3, _q, _s3); _s3.multiplyScalar(k); if (k > 0.5) n++;
      _m4.compose(_v3, _q, _s3); L.im.setMatrixAt(i, _m4);
    });
    L.im.instanceMatrix.needsUpdate = true;
  }
  WORLD.litterN = n;
}

function stepWorld(dt, t) { /* the world has no physics of its own; it is a function of ECO */ }

function writeWorld(t) {
  U.time.value = t;
  U.green.value = ECO.green;
  writeFlowers(ECO.flowers);
  writeOrchard();
  writeLitter(ECO.litter);
}

function V3(x, y, z) { return new THREE.Vector3(x, y, z); }
