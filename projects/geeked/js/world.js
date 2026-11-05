'use strict';
// =====================================================================
// WORLD — one downtown street to the horizon, a plaza with a fountain,
// a food truck, a billboard screen, a police car, a bench with a dog,
// traffic that the "geek" field slows to a crawl, and a plane overhead.
// =====================================================================

const WORLD = { cars: [] };
const U = { time: { value: 0 } };
const PLAZA = new THREE.Vector3(55, 0, 34);          // fountain / dance-circle centre
const ROAD_HW = 7, LANE = 2.4;
function groundHeightAt() { return 0; }
function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

function buildWorld(scene) {
  WORLD.scene = scene;
  buildGround(scene);
  buildBuildings(scene);
  buildStreetFurniture(scene);
  buildPlaza(scene);
  buildFoodTruck(scene);
  buildBillboard(scene);
  buildCars(scene);
  buildPlane(scene);
  buildDog(scene);
}

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
  pave(PLAZA.x, PLAZA.z + 2, 56, 40, 0.14);       // plaza
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), stdMat('#55613f', { roughness: 1 }));
  grass.position.y = -0.02; grass.receiveShadow = true; scene.add(grass);
}

// ---- buildings: one merged, vertex-tinted mesh with a tiling window texture ----
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
      if (side > 0 && x + w > 28 && x < 83) { x = 83; continue; }   // plaza gap
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
    if (side > 0 && x > 28 && x < 83) continue;
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

function buildPlaza(scene) {
  const parts = [];
  parts.push({ geo: new THREE.CylinderGeometry(4.2, 4.4, 0.7, 32), color: new THREE.Color('#bdb6a8'), matrix: M4(PLAZA.x, 0.35, PLAZA.z) });
  parts.push({ geo: new THREE.CylinderGeometry(0.5, 0.7, 2.2, 16), color: new THREE.Color('#bdb6a8'), matrix: M4(PLAZA.x, 1.1, PLAZA.z) });
  parts.push({ geo: new THREE.CylinderGeometry(1.4, 1.2, 0.3, 24), color: new THREE.Color('#bdb6a8'), matrix: M4(PLAZA.x, 2.2, PLAZA.z) });
  // trees round the edge
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 6.28 + 0.3, x = PLAZA.x + Math.cos(a) * 21, z = PLAZA.z + 2 + Math.sin(a) * 16;
    if (z < 14) continue;
    parts.push({ geo: new THREE.CylinderGeometry(0.15, 0.22, 3, 7), color: new THREE.Color('#4a3a2c'), matrix: M4(x, 1.5, z) });
    const g = new THREE.IcosahedronGeometry(2.2, 1);
    parts.push({ geo: g, color: hslC(0.27, 0.4, 0.28 + RNG() * 0.06), matrix: M4(x, 4.4, z, 0, RNG() * 6, 0, 1, 0.9, 1) });
  }
  // the bench where the dog sits
  WORLD.BENCH = V3(36, 0, 16.2);
  const B = WORLD.BENCH;
  parts.push({ geo: new THREE.BoxGeometry(2.2, 0.08, 0.55), color: new THREE.Color('#7a5236'), matrix: M4(B.x, 0.48, B.z) });
  parts.push({ geo: new THREE.BoxGeometry(2.2, 0.5, 0.07), color: new THREE.Color('#7a5236'), matrix: M4(B.x, 0.78, B.z + 0.28, -0.15, 0, 0) });
  for (const dx of [-0.95, 0.95]) parts.push({ geo: new THREE.BoxGeometry(0.08, 0.48, 0.5), color: new THREE.Color('#2b2f33'), matrix: M4(B.x + dx, 0.24, B.z) });
  const m = new THREE.Mesh(mergeGeoms(parts), stdMat('#ffffff', { vertexColors: true, roughness: 0.8 }));
  m.castShadow = m.receiveShadow = true; scene.add(m);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.05, 32), new THREE.MeshStandardMaterial({ color: '#5d8fa8', roughness: 0.1, metalness: 0.3 }));
  water.position.set(PLAZA.x, 0.62, PLAZA.z); scene.add(water);
  WORLD.spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 1.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.5, 1.7), transparent: true, opacity: 0.7 }));
  WORLD.spout.position.set(PLAZA.x, 3.1, PLAZA.z); scene.add(WORLD.spout);
}

function buildFoodTruck(scene) {
  WORLD.TRUCK = V3(-2, 0, ROAD_HW - 1.4);
  const T = WORLD.TRUCK, parts = [];
  parts.push({ geo: new THREE.BoxGeometry(6.5, 2.6, 2.4), color: new THREE.Color('#f2c230'), matrix: M4(T.x, 1.75, T.z) });
  parts.push({ geo: new THREE.BoxGeometry(1.8, 1.8, 2.3), color: new THREE.Color('#f2c230'), matrix: M4(T.x + 4.1, 1.35, T.z) });
  parts.push({ geo: new THREE.BoxGeometry(1.0, 0.8, 2.32), color: new THREE.Color('#25303a'), matrix: M4(T.x + 4.6, 1.8, T.z) });
  parts.push({ geo: new THREE.BoxGeometry(3.4, 1.1, 0.05), color: new THREE.Color('#1c1c1e'), matrix: M4(T.x - 0.4, 2.1, T.z + 1.21) });
  parts.push({ geo: new THREE.BoxGeometry(3.6, 0.08, 0.7), color: new THREE.Color('#c23a2a'), matrix: M4(T.x - 0.4, 2.75, T.z + 1.5, 0.35, 0, 0) });
  parts.push({ geo: new THREE.BoxGeometry(3.4, 0.08, 0.35), color: new THREE.Color('#9a9590'), matrix: M4(T.x - 0.4, 1.5, T.z + 1.35) });
  for (const dx of [-2.2, 1.6, 4.1]) parts.push({ geo: new THREE.CylinderGeometry(0.42, 0.42, 2.5, 14).rotateX(Math.PI / 2), color: new THREE.Color('#1b1b1b'), matrix: M4(T.x + dx, 0.42, T.z) });
  // giant hot dog on the roof
  parts.push({ geo: new THREE.CapsuleGeometry(0.42, 3.0, 6, 12).rotateZ(Math.PI / 2), color: new THREE.Color('#e0a35a'), matrix: M4(T.x - 0.6, 3.55, T.z) });
  parts.push({ geo: new THREE.CapsuleGeometry(0.26, 3.6, 6, 12).rotateZ(Math.PI / 2), color: new THREE.Color('#b0402c'), matrix: M4(T.x - 0.6, 3.85, T.z) });
  const m = new THREE.Mesh(mergeGeoms(parts), stdMat('#ffffff', { vertexColors: true, roughness: 0.5 }));
  m.castShadow = m.receiveShadow = true; scene.add(m);
  // menu sign
  const mkSign = (line2, col) => canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd84a'; g.font = '900 64px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('HOT DOGS', w / 2, 70);
    g.fillStyle = col; g.font = '800 40px Inter, sans-serif'; g.fillText(line2, w / 2, 130);
  });
  WORLD.signOpen = mkSign('OPEN 24/7', '#ffffff'); WORLD.signOut = mkSign('SOLD OUT. ALL OF IT.', '#ff5a3c');
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: WORLD.signOpen }));
  sm.position.set(T.x - 0.4, 2.15, T.z + 1.24); scene.add(sm);
  WORLD.signMesh = sm;
}

// ---- billboard screen: redrawn when its story beat changes ----
function buildBillboard(scene) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 384;
  WORLD.bbCanvas = c; WORLD.bbTex = new THREE.CanvasTexture(c); WORLD.bbTex.encoding = THREE.sRGBEncoding;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: WORLD.bbTex, color: new THREE.Color(1.5, 1.5, 1.5) }));
  WORLD.BB = V3(-34, 12, -ROAD_HW - 4.6);
  scr.position.copy(WORLD.BB); scene.add(scr);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(14.6, 7.6, 0.3), stdMat('#1a1a1c'));
  frame.position.copy(WORLD.BB).add(V3(0, 0, -0.45)); scene.add(frame);
  WORLD.bbState = '';
}
function drawBillboard(state) {
  const g = WORLD.bbCanvas.getContext('2d'), w = 768, h = 384;
  const head = (txt, col = '#ffffff', y = 110, size = 70) => { g.fillStyle = col; g.font = `900 ${size}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText(txt, w / 2, y); };
  if (state === 'ad') {
    g.fillStyle = '#c2352a'; g.fillRect(0, 0, w, h);
    head('HOT DOGS', '#ffd84a', 150, 110); head('YOU KNOW YOU WANT ONE', '#ffffff', 250, 46);
  } else if (state === 'stocks') {
    g.fillStyle = '#0c1a12'; g.fillRect(0, 0, w, h);
    head('MARKETS  +900%', '#3dff7a', 80, 64);
    g.strokeStyle = '#3dff7a'; g.lineWidth = 7; g.beginPath();
    const r = mulberry32(11); let y = 320;
    for (let x = 40; x < w - 40; x += 18) { y = clamp(y - (r() - 0.25) * 60, 110, 340); g.lineTo(x, y); }
    g.stroke();
    g.fillStyle = '#ffffff'; g.font = '700 30px Inter, sans-serif'; g.fillText('ANALYSTS: "NO IDEA BRO"', w / 2, 370);
  } else if (state === 'news') {
    g.fillStyle = '#10204a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d42a2a'; g.fillRect(0, 0, w, 90); head('BREAKING', '#ffffff', 68, 60);
    head('WORLD LEADERS AGREE', '#ffffff', 190, 52); head('SNACKS ARE "KINDA FIRE"', '#ffd84a', 270, 52);
  } else {
    g.fillStyle = '#10204a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d42a2a'; g.fillRect(0, 0, w, 90); head('BREAKING', '#ffffff', 68, 60);
    head('EVERYONE AGREES TO', '#ffffff', 190, 52); head('NEVER MENTION THIS', '#ffd84a', 270, 56);
  }
  WORLD.bbTex.needsUpdate = true;
}

// ---- traffic ----
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
function buildCars(scene) {
  const COLS = ['#c8c8c4', '#1d3b6b', '#8c1c1c', '#2b2b2e', '#e8e6e0', '#3f6b4a', '#6b6f75', '#d9a422', '#1d1d20', '#b04a2a'];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 });
  const R = mulberry32(77);
  for (let i = 0; i < 18; i++) {
    const dir = i % 2 ? -1 : 1;
    const c = {
      dir, lane: dir * LANE,
      x0: dir > 0 ? -190 + i * 9 + R() * 4 : 160 - i * 9 - R() * 4,
      v: 10 + R() * 3,
      tc: 9.5 + R() * 4.5, cy: (R() - 0.5) * 1.6, cz: (R() - 0.5) * 3.4, sw: R() * 6.28,
      mesh: new THREE.Mesh(carGeometry(COLS[i % COLS.length]), mat),
    };
    c.mesh.castShadow = true; scene.add(c.mesh); WORLD.cars.push(c);
  }
  // the police car, parked at the plaza with its lights going
  const pc = new THREE.Mesh(carGeometry('#f2f2f2'), mat);
  WORLD.POLICE = V3(30, 0, ROAD_HW + 3.5);
  pc.position.copy(WORLD.POLICE); pc.rotation.y = 0.5; pc.castShadow = true; scene.add(pc);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.25, 1.87), stdMat('#14233f'));
  stripe.position.y = 0.72; pc.add(stripe);
  WORLD.lightR = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.2, 0.2) });
  WORLD.lightB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.6, 7) });
  const lr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.6), WORLD.lightR); lr.position.set(-0.2, 1.84, 0.35); pc.add(lr);
  const lb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.6), WORLD.lightB); lb.position.set(-0.2, 1.84, -0.35); pc.add(lb);
}
// Distance travelled is analytic, so any time can be seeked exactly.
function carState(c, s) {
  const tau = 1.4, vg = 1.8;                       // geeked: about 4 mph
  const dist = tt => {
    if (tt <= G0) return c.v * tt;
    const u = tt - G0;
    return c.v * G0 + vg * u + (c.v - vg) * tau * (1 - Math.exp(-u / tau));
  };
  const stopT = Math.min(s, c.tc);
  const d = dist(stopT);
  const x = c.x0 + c.dir * d;
  const g = smooth(G0, G1, Math.min(s, c.tc));
  let z = c.lane + Math.sin(stopT * 0.9 + c.sw) * 1.4 * g;
  let yaw = c.dir > 0 ? 0 : Math.PI;
  yaw += Math.cos(stopT * 0.9 + c.sw) * 0.25 * g;
  const crashed = smooth(c.tc - 0.3, c.tc + 0.1, s);
  z += c.cz * crashed * 0.6; yaw += c.cy * crashed;
  return { x, z: clamp(z, -ROAD_HW + 1, ROAD_HW - 1), yaw, crashed: s > c.tc };
}

// ---- a plane at cruise, flown by the only sober pilot left: autopilot ----
function buildPlane(scene) {
  const P = [], wht = new THREE.Color('#e9ecef'), blu = new THREE.Color('#2a4c8c');
  P.push({ geo: new THREE.CylinderGeometry(1.9, 1.9, 36, 16).rotateZ(Math.PI / 2), color: wht, matrix: M4(0, 0, 0) });
  P.push({ geo: new THREE.SphereGeometry(1.9, 16, 10), color: wht, matrix: M4(18, 0, 0, 0, 0, 0, 2.2, 1, 1) });
  P.push({ geo: new THREE.ConeGeometry(1.9, 8, 16).rotateZ(Math.PI / 2), color: wht, matrix: M4(-22, 0.6, 0, 0, 0, 0, 1, 0.7, 1) });
  P.push({ geo: new THREE.BoxGeometry(7, 0.4, 34), color: wht, matrix: M4(1, -0.8, 0) });
  P.push({ geo: new THREE.BoxGeometry(3.5, 0.3, 11), color: wht, matrix: M4(-23, 0.8, 0) });
  P.push({ geo: new THREE.BoxGeometry(4.5, 7, 0.4), color: blu, matrix: M4(-23, 4, 0) });
  for (const z of [-7, 7]) P.push({ geo: new THREE.CylinderGeometry(1.1, 1.0, 4.5, 14).rotateZ(Math.PI / 2), color: new THREE.Color('#a9adb2'), matrix: M4(3, -2.2, z) });
  P.push({ geo: new THREE.BoxGeometry(30, 0.5, 0.1), color: blu, matrix: M4(-1, 0.5, 1.91) });
  for (let k = 0; k < 14; k++) P.push({ geo: new THREE.BoxGeometry(0.6, 0.5, 0.1), color: new THREE.Color('#1c2430'), matrix: M4(12 - k * 2.2, 0.9, 1.9) });
  WORLD.plane = new THREE.Mesh(mergeGeoms(P), stdMat('#ffffff', { vertexColors: true, roughness: 0.4, metalness: 0.3 }));
  scene.add(WORLD.plane);
  // a cloud deck below the plane
  const cl = [], R = mulberry32(5);
  for (let i = 0; i < 70; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    cl.push({ geo: g, color: new THREE.Color(1, 1, 1), matrix: M4(rr(-300, 300, R), 700 + rr(-10, 10, R), rr(-260, 120, R), 0, R() * 6, 0, rr(25, 60, R), rr(8, 16, R), rr(25, 60, R)) });
  }
  WORLD.clouds = new THREE.Mesh(mergeGeoms(cl), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  scene.add(WORLD.clouds);
}
function planePos(t, out) { return out.set(-600 + (t - 22.6) * 70, 760, -60); }

// ---- the one creature on Earth who is not geeked ----
function buildDog(scene) {
  const fur = new THREE.Color('#c08a4e'), light = new THREE.Color('#ead2ae'), dark = new THREE.Color('#2a1d14');
  const B = [];
  B.push({ geo: new THREE.CapsuleGeometry(0.17, 0.32, 6, 10), color: fur, matrix: M4(0, 0.3, 0.05, -0.55, 0, 0) });
  B.push({ geo: new THREE.SphereGeometry(0.12, 10, 8), color: light, matrix: M4(0, 0.36, -0.12, 0, 0, 0, 1, 1.2, 0.8) });
  for (const x of [-0.08, 0.08]) {
    B.push({ geo: new THREE.CylinderGeometry(0.04, 0.035, 0.3, 8), color: fur, matrix: M4(x, 0.15, -0.12) });
    B.push({ geo: new THREE.SphereGeometry(0.05, 8, 6), color: light, matrix: M4(x, 0.02, -0.15, 0, 0, 0, 1, 0.6, 1.3) });
    B.push({ geo: new THREE.SphereGeometry(0.09, 8, 6), color: fur, matrix: M4(x * 1.6, 0.07, 0.15, 0, 0, 0, 1, 0.7, 1.6) });
  }
  B.push({ geo: new THREE.CylinderGeometry(0.03, 0.015, 0.3, 6), color: fur, matrix: M4(0, 0.1, 0.32, 1.3, 0, 0) });
  WORLD.dog = new THREE.Mesh(mergeGeoms(B), stdMat('#ffffff', { vertexColors: true, roughness: 0.9 }));
  const H = [];
  H.push({ geo: new THREE.SphereGeometry(0.13, 12, 10), color: fur, matrix: M4(0, 0, 0, 0, 0, 0, 1, 0.95, 1.05) });
  H.push({ geo: new THREE.BoxGeometry(0.11, 0.09, 0.14), color: light, matrix: M4(0, -0.04, -0.15) });
  H.push({ geo: new THREE.SphereGeometry(0.03, 8, 6), color: dark, matrix: M4(0, -0.01, -0.225) });
  for (const x of [-0.055, 0.055]) {
    H.push({ geo: new THREE.SphereGeometry(0.024, 8, 6), color: dark, matrix: M4(x, 0.035, -0.115) });
    H.push({ geo: new THREE.SphereGeometry(0.008, 6, 4), color: new THREE.Color(2.5, 2.5, 2.5), matrix: M4(x + 0.008, 0.045, -0.136) });
    H.push({ geo: new THREE.BoxGeometry(0.06, 0.16, 0.03), color: new THREE.Color('#8a5a30'), matrix: M4(x * 2.1, -0.01, 0.02, 0, 0, Math.sign(x) * 0.35) });
  }
  WORLD.dogHead = new THREE.Mesh(mergeGeoms(H), stdMat('#ffffff', { vertexColors: true, roughness: 0.8 }));
  WORLD.dog.position.set(WORLD.BENCH.x + 0.4, 0.52, WORLD.BENCH.z);
  WORLD.dogHead.position.set(0, 0.56, -0.17);
  WORLD.dog.add(WORLD.dogHead);
  WORLD.dog.castShadow = WORLD.dogHead.castShadow = true;
  scene.add(WORLD.dog);
}

function stepWorld() {}

function writeWorld(t) {
  U.time.value = t;
  const s = GK.s;
  for (const c of WORLD.cars) {
    const st = carState(c, s);
    c.mesh.position.set(st.x, 0, st.z); c.mesh.rotation.set(0, -st.yaw, 0);
  }
  // traffic lights: obeyed, then a disco
  const disco = GK.geek > 0.2;
  WORLD.tlights.forEach((m, i) => {
    const k = Math.floor(t * 3 + i) % 3;
    m.color.setRGB(disco ? [4, 3, 0][k] : 0, disco ? [0, 2.4, 3.2][k] : 3, disco ? [0, 0, 0.6][k] : 0.8);
  });
  const ph = Math.floor(t * 6) % 2;
  WORLD.lightR.color.setRGB(ph ? 8 : 0.4, 0.1, 0.1);
  WORLD.lightB.color.setRGB(0.1, 0.4, ph ? 0.6 : 9);
  WORLD.spout.scale.y = 1 + Math.sin(t * 7) * 0.08;
  planePos(t, WORLD.plane.position);
  WORLD.plane.rotation.set(Math.sin(t * 0.6) * 0.04, 0, 0);
  // the dog: still, judging. A head tilt on its two big beats.
  WORLD.dogHead.rotation.set(0.1, 0, smooth(50.2, 50.6, s) * 0.32 * (1 - smooth(52.6, 53.0, s)) - smooth(53.4, 53.8, s) * 0.12);
  WORLD.signMesh.material.map = GK.snacks < 0.02 ? WORLD.signOut : WORLD.signOpen;
  const bb = s < 26 ? 'ad' : s < 32 ? 'stocks' : s < SOBER0 ? 'news' : 'after';
  if (bb !== WORLD.bbState) { WORLD.bbState = bb; drawBillboard(bb); }
}
