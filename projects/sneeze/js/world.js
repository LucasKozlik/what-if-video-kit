'use strict';
// =====================================================================
// WORLD — one city on one grid: the avenue (crowded sidewalk, a sunny
// arcade), a highway, a stadium at the end of the avenue, and three
// interiors inside the same city: a cockpit at cruise, an operating room,
// and a bedroom.
// =====================================================================

const WORLD = {};
const U = { time: { value: 0 }, haze: { value: 0 } };
const ROAD_HW = 7, LANE = 2.4;
function groundHeightAt() { return 0; }
function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

function buildGround(scene) {
  const asphalt = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#3b3d40', 0.14, 3);
    g.fillStyle = '#e8e2c8'; // centre dashes run along u
    for (let x = 0; x < w; x += 64) g.fillRect(x, h / 2 - 3, 36, 6);
  }, { repeat: true });
  asphalt.repeat.set(400 / 8, 1);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_HW * 2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }));
  road.receiveShadow = true; scene.add(road);
  // edge lines
  for (const z of [-ROAD_HW + 0.3, ROAD_HW - 0.3]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.15).rotateX(-Math.PI / 2), stdMat('#d9d4c0'));
    l.position.set(0, 0.01, z); scene.add(l);
  }
  const paving = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#b9b4aa', 0.1, 4);
    g.strokeStyle = 'rgba(60,55,50,0.35)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  }, { repeat: true });
  const pave = (x, z, w, d, y = 0.15) => {
    const t = paving.clone(); t.needsUpdate = true; t.repeat.set(w / 3, d / 3);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, y, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    m.position.set(x, y / 2, z); m.receiveShadow = true; scene.add(m); return m;
  };
  pave(0, ROAD_HW + 2.5, 400, 5); pave(0, -ROAD_HW - 2.5, 400, 5);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), stdMat('#55613f', { roughness: 1 }));
  grass.position.y = -0.02; grass.receiveShadow = true; scene.add(grass);
}

function buildBuildings(scene) {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    noiseFill(g, w, h, 'rgba(0,0,0,0)', 0.08, 4);
    g.fillStyle = '#8e8a84'; g.fillRect(0, h * 0.9, w, h * 0.1);
    g.fillStyle = '#26303c'; g.fillRect(w * 0.18, h * 0.16, w * 0.64, h * 0.6);
    g.fillStyle = '#3d4a5a'; g.fillRect(w * 0.18, h * 0.16, w * 0.64, h * 0.22);
    g.fillStyle = '#d8d3c8'; g.fillRect(w * 0.48, h * 0.16, w * 0.04, h * 0.6);
  }, { repeat: true });
  const COLS = ['#c9b79c', '#b5845f', '#d8d2c4', '#9a6b52', '#c4c9cc', '#e0cfa8', '#8f9aa3', '#b8a58a'];
  const parts = [];
  const street = (side, x0, x1) => {
    let x = x0;
    while (x < x1) {
      const w = rr(9, 18), d = rr(12, 20), h = rr(10, 34) * (Math.abs(x) < 60 ? 1 : 1.4);
      const g = new THREE.BoxGeometry(w - 0.4, h, d);
      const uv = g.attributes.uv;
      // faces: +x, -x, +y, -y, +z, -z (4 verts each): scale UVs to 4 m x 3.5 m bays
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k, fw = f < 2 ? d : w;
        if (f === 2 || f === 3) uv.setXY(i, 0.95, 0.95);
        else uv.setXY(i, uv.getX(i) * fw / 4, uv.getY(i) * h / 3.5);
      }
      const z = side * (ROAD_HW + 5 + d / 2);
      parts.push({ geo: g, color: new THREE.Color(rpick(COLS)), matrix: M4(x + w / 2, h / 2, z) });
      x += w;
    }
  };
  street(1, -260, 260); street(-1, -260, 260);
  const city = new THREE.Mesh(mergeGeoms(parts), new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.85 }));
  city.castShadow = city.receiveShadow = true; scene.add(city);
  // a far skyline so the street does not end in a void
  const far = [];
  for (let i = 0; i < 160; i++) {
    const a = RNG() * 6.28, r = 300 + RNG() * 600, h = 20 + RNG() * 90, w = 15 + RNG() * 30;
    far.push({ geo: new THREE.BoxGeometry(w, h, w), color: new THREE.Color(rpick(COLS)).multiplyScalar(0.8), matrix: M4(Math.cos(a) * r, h / 2, Math.sin(a) * r) });
  }
  const sky = new THREE.Mesh(mergeGeoms(far), new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.9 }));
  scene.add(sky);
}

function buildStreetFurniture(scene) {
  const parts = [];
  WORLD.lamps = [];
  for (let x = -120; x <= 120; x += 14) for (const side of [1, -1]) {
    const z = side * (ROAD_HW + 0.7);
    WORLD.lamps.push(V3(x, 0, z));
    parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.1, 6, 8), color: new THREE.Color('#2b2f33'), matrix: M4(x, 3.15, z) });
    parts.push({ geo: new THREE.BoxGeometry(0.12, 0.12, 1.6), color: new THREE.Color('#2b2f33'), matrix: M4(x, 6.1, z - side * 0.7) });
    parts.push({ geo: new THREE.BoxGeometry(0.4, 0.15, 0.6), color: new THREE.Color('#d6d2c2'), matrix: M4(x, 6.0, z - side * 1.4) });
  }
  // traffic lights at a crossing
  for (const [x, z, r] of [[-20, ROAD_HW + 0.8, 0], [-20, -ROAD_HW - 0.8, Math.PI]]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8), color: new THREE.Color('#2b2f33'), matrix: M4(x, 2.4, z) });
    parts.push({ geo: new THREE.BoxGeometry(0.4, 1.1, 0.35), color: new THREE.Color('#1d2024'), matrix: M4(x, 4.6, z, 0, r, 0) });
  }
  for (let i = -6; i <= 6; i++) parts.push({ geo: new THREE.BoxGeometry(0.6, 0.02, 2.2), color: new THREE.Color('#e6e1cf'), matrix: M4(-24, 0.012, i * 1.0, 0, Math.PI / 2, 0) });
  const m = new THREE.Mesh(mergeGeoms(parts), stdMat('#ffffff', { vertexColors: true, roughness: 0.6, metalness: 0.2 }));
  m.castShadow = true; m.receiveShadow = true; scene.add(m);
  // the lights themselves change colour once nobody is obeying them
  WORLD.tlights = [];
  for (const [x, z] of [[-20, ROAD_HW + 0.62], [-20, -ROAD_HW - 0.62]]) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 3, 0.8) });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat);
    b.position.set(x, 4.6, z); scene.add(b); WORLD.tlights.push(mat);
  }
}

function carGeometry(color) {
  const P = [];
  const body = new THREE.Color(color), glass = new THREE.Color('#1e2630'), dark = new THREE.Color('#151515');
  P.push({ geo: new THREE.BoxGeometry(4.3, 0.75, 1.85), color: body, matrix: M4(0, 0.7, 0) });
  P.push({ geo: new THREE.BoxGeometry(2.3, 0.62, 1.66), color: glass, matrix: M4(-0.2, 1.36, 0) });
  P.push({ geo: new THREE.BoxGeometry(2.1, 0.1, 1.6), color: body, matrix: M4(-0.2, 1.7, 0) });
  for (const [x, z] of [[1.35, 0.85], [1.35, -0.85], [-1.35, 0.85], [-1.35, -0.85]])
    P.push({ geo: new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14).rotateX(Math.PI / 2), color: dark, matrix: M4(x, 0.36, z) });
  P.push({ geo: new THREE.BoxGeometry(0.06, 0.18, 0.4), color: new THREE.Color(3, 3, 2.6), matrix: M4(2.16, 0.78, 0.6) });
  P.push({ geo: new THREE.BoxGeometry(0.06, 0.18, 0.4), color: new THREE.Color(3, 3, 2.6), matrix: M4(2.16, 0.78, -0.6) });
  return mergeGeoms(P);
}

// ---- sets that live elsewhere on the same grid ----
const SETS = {
  street:  { x: 0, y: 0, z: 0, yaw: 0 },
  cockpit: { x: 0, y: 760, z: 500, yaw: 0 },
  or:      { x: -420, y: 0, z: 200, yaw: 0 },
  bed:     { x: -420, y: 0, z: -200, yaw: 0 },
};
const HWZ = -170;                                       // highway centreline
const STADIUM = { c: V3(430, 0, 0), a: 56, b: 37, seats: [] };

function buildWorld(scene) {
  WORLD.scene = scene;
  buildGround(scene);
  buildBuildings(scene);
  buildStreetFurniture(scene);
  buildArcade(scene);
  buildStreetCars(scene);
  buildHighway(scene);
  buildStadium(scene);
  buildCockpit(scene);
  buildOR(scene);
  buildBedroom(scene);
}

// A colonnade on the sunny side of the street: shade under it, bright sun beyond.
function buildArcade(scene) {
  const P = [], stone = new THREE.Color('#cfc6b6');
  P.push({ geo: new THREE.BoxGeometry(10, 0.5, 4.8), color: stone, matrix: M4(21, 4.25, -ROAD_HW - 2.6) });
  for (let x = 16.5; x <= 25.6; x += 3) P.push({ geo: new THREE.CylinderGeometry(0.25, 0.28, 4, 12), color: stone, matrix: M4(x, 2.0, -ROAD_HW - 0.55) });
  P.push({ geo: new THREE.BoxGeometry(2.4, 3.0, 0.1), color: new THREE.Color('#1c1814'), matrix: M4(21, 1.5, -ROAD_HW - 4.98) });
  const m = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.85 }));
  m.castShadow = m.receiveShadow = true; scene.add(m);
}

// ---- traffic on the avenue: steady, unremarkable ----
function buildStreetCars(scene) {
  const COLS = ['#c8c8c4', '#1d3b6b', '#8c1c1c', '#2b2b2e', '#e8e6e0', '#3f6b4a', '#6b6f75', '#b04a2a'];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 });
  WORLD.cars = [];
  for (let i = 0; i < 12; i++) {
    const dir = i % 2 ? -1 : 1;
    const c = { dir, z: dir * LANE, x0: i * 41.7, v: 8 + hash1(i) * 2.5, mesh: new THREE.Mesh(carGeometry(COLS[i % COLS.length]), mat) };
    c.mesh.castShadow = true; scene.add(c.mesh); WORLD.cars.push(c);
  }
}

// ---- the highway: 4 lanes at 60 mph (26.8 m/s) ----
function buildHighway(scene) {
  const tex = canvasTex(512, 256, (g, w, h) => {
    noiseFill(g, w, h, '#45474a', 0.12, 3);
    g.fillStyle = '#e8e2c8';
    for (const y of [64, 192]) for (let x = 0; x < w; x += 128) g.fillRect(x, y - 3, 64, 6);
    g.fillStyle = '#e8c040'; g.fillRect(0, 126, w, 4);
    g.fillStyle = '#eeeeee'; g.fillRect(0, 4, w, 5); g.fillRect(0, h - 9, w, 5);
  }, { repeat: true });
  tex.repeat.set(2400 / 12, 1);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(2400, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  road.position.set(0, 0.02, HWZ); road.receiveShadow = true; scene.add(road);
  const P = [];
  for (let x = -1200; x < 1200; x += 4) for (const z of [HWZ - 8.6, HWZ + 8.6]) P.push({ geo: new THREE.BoxGeometry(0.12, 0.8, 0.12), color: new THREE.Color('#9a9da0'), matrix: M4(x, 0.4, z) });
  for (const z of [HWZ - 8.5, HWZ + 8.5]) P.push({ geo: new THREE.BoxGeometry(2400, 0.32, 0.06), color: new THREE.Color('#b9bcbf'), matrix: M4(0, 0.7, z) });
  // an overhead sign gantry
  P.push({ geo: new THREE.BoxGeometry(0.4, 7, 0.4), color: new THREE.Color('#8a8d90'), matrix: M4(160, 3.5, HWZ - 9) });
  P.push({ geo: new THREE.BoxGeometry(0.4, 7, 0.4), color: new THREE.Color('#8a8d90'), matrix: M4(160, 3.5, HWZ + 9) });
  P.push({ geo: new THREE.BoxGeometry(0.5, 0.5, 18.4), color: new THREE.Color('#8a8d90'), matrix: M4(160, 7, HWZ) });
  P.push({ geo: new THREE.BoxGeometry(0.2, 2.2, 6), color: new THREE.Color('#1f6b3a'), matrix: M4(159.8, 5.6, HWZ - 4) });
  const m = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.6, metalness: 0.3 }));
  m.receiveShadow = true; scene.add(m);
  // trees along the verge
  const tg = new THREE.IcosahedronGeometry(1, 1), R = mulberry32(55);
  const trees = new THREE.InstancedMesh(tg, stdMat('#4d6b35', { flatShading: true }), 260);
  for (let i = 0; i < 260; i++) {
    const x = rr(-600, 900, R), z = HWZ + (R() < 0.5 ? -1 : 1) * rr(14, 60, R), s = rr(2.5, 5, R);
    trees.setMatrixAt(i, M4(x, s, z, 0, R() * 6, 0, s, s * 1.2, s));
  }
  trees.castShadow = true; trees.frustumCulled = false; scene.add(trees);

  const COLS = ['#d8d8d4', '#1d3b6b', '#8c1c1c', '#2b2b2e', '#3f6b4a', '#6b6f75', '#e8a020', '#5a2a6a'];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 });
  WORLD.hw = [];
  const lanes = [[HWZ + 5.4, 1], [HWZ + 1.8, 1], [HWZ - 1.8, -1], [HWZ - 5.4, -1]];
  for (let i = 0; i < 22; i++) {
    const [z, dir] = lanes[i % 4];
    const c = { z, dir, x0: (i === 0 ? 0 : (Math.floor(i / 4) * 34 + (i % 4) * 11 + hash1(i) * 9) * (dir > 0 ? 1 : -1) + (dir > 0 ? 6 : 40)), drift: (hash1(i * 7) - 0.5) * 1.3, brk: 0.12 * (i % 7) };
    if (i === 0) c.z = HWZ + 1.8;
    c.mesh = new THREE.Mesh(carGeometry(COLS[i % COLS.length]), mat);
    c.brake = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.02, 0.02) });
    for (const zz of [-0.62, 0.62]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.36), c.brake); b.position.set(-2.17, 0.84, zz); c.mesh.add(b); }
    c.mesh.castShadow = true; scene.add(c.mesh); WORLD.hw.push(c);
  }
}
// Highway car state, analytic in film time. Every driver's eyes shut for one second.
function hwState(c, t) {
  const v = 26.8, t0 = T_HIGHWAY;
  const brakeOn = smooth(t0 + 1.0 + c.brk, t0 + 1.15 + c.brk, t);
  const slow = Math.max(0, t - (t0 + 1.0 + c.brk));
  const dist = v * (t - 24) - 3.2 * slow * slow * (slow < 2.5 ? 1 : 0) - (slow >= 2.5 ? 3.2 * 6.25 + 16 * (slow - 2.5) : 0);
  const blind = smooth(t0, t0 + 1.0, t);
  return { x: c.x0 + c.dir * dist, z: c.z + c.drift * blind * (c === WORLD.hw[0] ? 0.9 : 1), yaw: (c.dir > 0 ? 0 : Math.PI) + c.drift * 0.04 * Math.sin(Math.PI * blind), brake: brakeOn };
}

// ---- the stadium: a bowl of stepped tiers full of people ----
function buildStadium(scene) {
  const C = STADIUM.c, P = [], concrete = new THREE.Color('#b9b5ad'), seat = new THREE.Color('#2a4c8c');
  const ring = (a0, b0, a1, b1, y, h, col, seg = 120) => {
    const pos = [];
    for (let k = 0; k < seg; k++) {
      const t0 = k / seg * Math.PI * 2, t1 = (k + 1) / seg * Math.PI * 2;
      const p = (a, b, t, yy) => [C.x + Math.cos(t) * a, yy, C.z + Math.sin(t) * b];
      const i0 = p(a0, b0, t0, y + h), i1 = p(a0, b0, t1, y + h), o0 = p(a1, b1, t0, y + h), o1 = p(a1, b1, t1, y + h);
      const d0 = p(a0, b0, t0, y), d1 = p(a0, b0, t1, y);
      pos.push(...i0, ...o0, ...i1, ...i1, ...o0, ...o1);          // tread
      pos.push(...d0, ...i0, ...d1, ...d1, ...i0, ...i1);          // riser
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    P.push({ geo: g, color: col });
  };
  const T = 16;
  for (let k = 0; k < T; k++) {
    const a = STADIUM.a + 5 + k * 1.7, b = STADIUM.b + 5 + k * 1.7, y = 1.2 + k * 0.78;
    ring(a, b, a + 1.7, b + 1.7, y, 0.78, k % 2 ? seat : seat.clone().multiplyScalar(0.85));
    // seats along the tread
    const per = Math.floor(2 * Math.PI * Math.sqrt((a * a + b * b) / 2) / 0.72);
    for (let j = 0; j < per; j++) {
      const th = j / per * Math.PI * 2 + k * 0.013;
      if (Math.abs(Math.sin(th * 6)) < 0.05) continue;           // aisles
      const x = C.x + Math.cos(th) * (a + 0.7), z = C.z + Math.sin(th) * (b + 0.7);
      STADIUM.seats.push({ x, y: y + 0.78 + 0.42, z, yaw: Math.atan2(C.x - x, C.z - z) });
    }
  }
  ring(STADIUM.a + 5, STADIUM.b + 5, STADIUM.a + 5.05, STADIUM.b + 5.05, 0, 1.25, concrete);
  ring(STADIUM.a + 5 + T * 1.7, STADIUM.b + 5 + T * 1.7, STADIUM.a + 5 + T * 1.7 + 0.6, STADIUM.b + 5 + T * 1.7 + 0.6, 0, 1.2 + T * 0.78 + 3, concrete);
  const bowl = new THREE.Mesh(mergeGeoms(P), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
  bowl.castShadow = bowl.receiveShadow = true; scene.add(bowl);
  const pitch = canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#3f7a32' : '#468a38'; g.fillRect(i * w / 12, 0, w / 12, h); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.strokeRect(30, 30, w - 60, h - 60);
    g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 30); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 6.28); g.stroke();
  });
  const pm = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pitch, roughness: 0.95 }));
  pm.scale.set(STADIUM.a + 5, 1, STADIUM.b + 5); pm.position.set(C.x, 0.05, C.z); pm.receiveShadow = true; scene.add(pm);
  // floodlight masts
  const fl = [];
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = C.x + dx * (STADIUM.a + 34), z = C.z + dz * (STADIUM.b + 34);
    fl.push({ geo: new THREE.CylinderGeometry(0.5, 0.8, 42, 8), color: new THREE.Color('#8a8d90'), matrix: M4(x, 21, z) });
    fl.push({ geo: new THREE.BoxGeometry(6, 3, 0.6), color: new THREE.Color('#dcdcd6'), matrix: M4(x, 42, z, 0, Math.atan2(-dx, -dz), 0) });
  }
  const fm = new THREE.Mesh(mergeGeoms(fl), stdMat('#ffffff', { vertexColors: true }));
  fm.castShadow = true; scene.add(fm);
}

// ---- the cockpit, at cruise above a cloud deck ----
function buildCockpit(scene) {
  const O = SETS.cockpit, P = [], grey = new THREE.Color('#3a3d42'), dark = new THREE.Color('#1c1e22'), beige = new THREE.Color('#9a9790');
  const at = (x, y, z) => M4(O.x + x, O.y + y, O.z + z);
  P.push({ geo: new THREE.BoxGeometry(3.4, 0.1, 2.6), color: dark, matrix: at(0.3, 0, 0) });
  P.push({ geo: new THREE.BoxGeometry(0.9, 0.9, 2.4), color: grey, matrix: at(1.25, 0.55, 0) });              // console
  P.push({ geo: new THREE.BoxGeometry(0.6, 0.1, 1.2), color: dark, matrix: at(0.8, 0.95, 0) });               // pedestal
  P.push({ geo: new THREE.BoxGeometry(0.5, 0.25, 2.4), color: grey, matrix: at(1.45, 1.75, 0, 0, 0, 0) });     // glareshield
  P.push({ geo: new THREE.BoxGeometry(3.4, 0.1, 2.6), color: beige, matrix: at(0.3, 2.3, 0) });               // ceiling
  for (const z of [-1.25, 1.25]) P.push({ geo: new THREE.BoxGeometry(3.4, 2.3, 0.1), color: beige, matrix: at(0.3, 1.15, z) });
  for (const z of [-0.9, 0, 0.9]) P.push({ geo: new THREE.BoxGeometry(0.12, 0.7, 0.1), color: dark, matrix: at(1.7, 2.0, z, 0, 0, 0.5) });  // window posts
  for (const z of [-0.5, 0.5]) {                         // seats
    P.push({ geo: new THREE.BoxGeometry(0.55, 0.12, 0.55), color: dark, matrix: at(-0.5, 0.48, z) });
    P.push({ geo: new THREE.BoxGeometry(0.12, 0.9, 0.55), color: dark, matrix: at(-0.82, 0.95, z) });
    P.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), color: grey, matrix: at(0.55, 0.82, z, 0, 0, 1.2) });   // yoke column
  }
  const m = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.6 }));
  m.receiveShadow = true; scene.add(m);
  // displays: autopilot engaged
  const scr = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3dff7a'; g.font = '800 44px Inter, sans-serif'; g.textAlign = 'center';
    g.fillText('AP1  ENGAGED', w / 2, 70); g.fillStyle = '#57c7ff'; g.fillText('FL350   HDG 270', w / 2, 140);
    g.fillStyle = '#ffffff'; g.font = '600 30px Inter, sans-serif'; g.fillText('ALT HOLD  ·  SPD 0.78 M', w / 2, 210);
  });
  for (const z of [-0.6, 0.6]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: scr, color: new THREE.Color(1.6, 1.6, 1.6) }));
    s.position.set(O.x + 0.795, O.y + 1.2, O.z + z); s.rotation.y = -Math.PI / 2; s.rotation.x = 0; scene.add(s);
  }
  const lamp = new THREE.PointLight(0xfff2e0, 1.2, 6); lamp.position.set(O.x, O.y + 2.1, O.z); scene.add(lamp);
  // the cloud deck
  const cl = [], R = mulberry32(5);
  for (let i = 0; i < 90; i++) cl.push({ geo: new THREE.IcosahedronGeometry(1, 1), color: new THREE.Color(1, 1, 1), matrix: M4(O.x + rr(-200, 900, R), O.y - 55 + rr(-8, 8, R), O.z + rr(-500, 500, R), 0, R() * 6, 0, rr(25, 60, R), rr(7, 14, R), rr(25, 60, R)) });
  scene.add(new THREE.Mesh(mergeGeoms(cl), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
}

function room(O, w, h, d, wall, floor) {
  const P = [];
  P.push({ geo: new THREE.BoxGeometry(w, 0.1, d), color: new THREE.Color(floor), matrix: M4(O.x, O.y - 0.05, O.z) });
  P.push({ geo: new THREE.BoxGeometry(w, 0.1, d), color: new THREE.Color(wall).multiplyScalar(1.1), matrix: M4(O.x, O.y + h, O.z) });
  for (const s of [-1, 1]) {
    P.push({ geo: new THREE.BoxGeometry(0.1, h, d), color: new THREE.Color(wall), matrix: M4(O.x + s * w / 2, O.y + h / 2, O.z) });
    P.push({ geo: new THREE.BoxGeometry(w, h, 0.1), color: new THREE.Color(wall), matrix: M4(O.x, O.y + h / 2, O.z + s * d / 2) });
  }
  return P;
}

// ---- the operating room ----
function buildOR(scene) {
  const O = SETS.or, P = room(O, 8, 3.2, 7, '#7fb0a8', '#9aa3a6');
  const at = (x, y, z, ...r) => M4(O.x + x, O.y + y, O.z + z, ...r);
  P.push({ geo: new THREE.BoxGeometry(0.7, 0.12, 2.1), color: new THREE.Color('#5a6066'), matrix: at(0, 0.84, 0) });
  P.push({ geo: new THREE.CylinderGeometry(0.12, 0.25, 0.8, 10), color: new THREE.Color('#8a9096'), matrix: at(0, 0.4, 0) });
  P.push({ geo: new THREE.BoxGeometry(0.78, 0.14, 1.7), color: new THREE.Color('#4f8fb0'), matrix: at(0, 1.02, 0.25) });        // drape over the patient
  P.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), color: new THREE.Color('#c0c4c8'), matrix: at(0, 2.6, 0) });
  P.push({ geo: new THREE.CylinderGeometry(0.5, 0.42, 0.18, 24), color: new THREE.Color('#d8dce0'), matrix: at(0, 2.0, 0) });  // surgical lamp
  P.push({ geo: new THREE.BoxGeometry(0.5, 0.4, 0.3), color: new THREE.Color('#2a2d30'), matrix: at(-1.2, 1.5, -1.2) });       // monitor
  P.push({ geo: new THREE.CylinderGeometry(0.015, 0.015, 1.9, 6), color: new THREE.Color('#c0c4c8'), matrix: at(-0.8, 0.95, -0.9) });
  P.push({ geo: new THREE.BoxGeometry(0.16, 0.24, 0.06), color: new THREE.Color('#d8e8f0'), matrix: at(-0.8, 1.8, -0.9) });     // IV bag
  P.push({ geo: new THREE.BoxGeometry(1.0, 0.9, 0.5), color: new THREE.Color('#b8bfc4'), matrix: at(-2.6, 0.45, 1.6) });       // trolley
  const m = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.castShadow = true; scene.add(m);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 4.6) }));
  lens.rotation.x = Math.PI / 2; lens.position.set(O.x, O.y + 1.9, O.z); scene.add(lens);
  const mon = canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#04080a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3dff7a'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x < w; x++) { const k = x % 64; g.lineTo(x, 80 - (k > 20 && k < 26 ? (k - 20) * 12 : 0) + (k > 26 && k < 30 ? 40 : 0)); }
    g.stroke(); g.fillStyle = '#3dff7a'; g.font = '700 34px Inter'; g.fillText('HR 72', 20, 160);
  });
  const ms = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshBasicMaterial({ map: mon, color: new THREE.Color(1.5, 1.5, 1.5) }));
  ms.position.set(O.x - 1.2, O.y + 1.5, O.z - 1.04); scene.add(ms);
  const L = new THREE.PointLight(0xf4fbff, 2.2, 9); L.position.set(O.x, O.y + 1.7, O.z); scene.add(L);
  const L2 = new THREE.PointLight(0xdff0ff, 0.8, 12); L2.position.set(O.x + 2, O.y + 2.8, O.z + 2); scene.add(L2);
}

// ---- the bedroom ----
function buildBedroom(scene) {
  const O = SETS.bed, P = room(O, 5, 2.8, 5, '#d8c7b0', '#8a6a4c');
  const at = (x, y, z, ...r) => M4(O.x + x, O.y + y, O.z + z, ...r);
  P.push({ geo: new THREE.BoxGeometry(1.5, 0.35, 2.1), color: new THREE.Color('#5a4030'), matrix: at(0, 0.18, 0.55) });     // frame
  P.push({ geo: new THREE.BoxGeometry(1.42, 0.22, 2.0), color: new THREE.Color('#ecebe6'), matrix: at(0, 0.45, 0.55) });    // mattress
  P.push({ geo: new THREE.BoxGeometry(1.46, 0.3, 1.5), color: new THREE.Color('#5d7fa6'), matrix: at(0, 0.66, 0.86) });     // duvet over the legs
  P.push({ geo: new THREE.BoxGeometry(1.5, 1.1, 0.1), color: new THREE.Color('#5a4030'), matrix: at(0, 0.75, -0.5) });      // headboard
  P.push({ geo: new THREE.BoxGeometry(0.6, 0.3, 0.3), color: new THREE.Color('#f4f2ea'), matrix: at(0, 0.66, -0.3, -0.4, 0, 0) });  // pillow
  P.push({ geo: new THREE.BoxGeometry(0.5, 0.55, 0.45), color: new THREE.Color('#6b4c36'), matrix: at(1.1, 0.28, -0.25) });  // nightstand
  P.push({ geo: new THREE.CylinderGeometry(0.06, 0.09, 0.3, 10), color: new THREE.Color('#d8d2c4'), matrix: at(1.1, 0.7, -0.25) });
  P.push({ geo: new THREE.CylinderGeometry(0.12, 0.17, 0.2, 14, 1, true), color: new THREE.Color('#f0e0c0'), matrix: at(1.1, 0.95, -0.25) });
  P.push({ geo: new THREE.BoxGeometry(0.7, 0.5, 0.04), color: new THREE.Color('#3a5a6a'), matrix: at(-1.0, 1.6, -2.45) });   // a picture
  const m = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.castShadow = true; scene.add(m);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.4, 3.8) }));
  win.position.set(O.x - 2.44, O.y + 1.5, O.z + 0.6); win.rotation.y = Math.PI / 2; scene.add(win);
  const L = new THREE.PointLight(0xffe6c4, 1.5, 7); L.position.set(O.x + 0.8, O.y + 1.6, O.z + 0.2); scene.add(L);
  const L2 = new THREE.PointLight(0xdfe8ff, 1.2, 7); L2.position.set(O.x - 1.8, O.y + 1.5, O.z + 0.8); scene.add(L2);
}

function stepWorld() {}

function writeWorld(t) {
  U.time.value = t;
  for (const c of WORLD.cars) {
    const x = ((c.x0 + c.dir * c.v * t) % 500 + 750) % 500 - 250;
    c.mesh.position.set(x, 0, c.z); c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
  }
  for (const c of WORLD.hw) {
    const st = hwState(c, t);
    c.mesh.position.set(st.x, 0.02, st.z); c.mesh.rotation.y = -st.yaw;
    c.brake.color.setRGB(0.25 + 9 * st.brake, 0.02 + 0.3 * st.brake, 0.02 + 0.2 * st.brake);
  }
}
