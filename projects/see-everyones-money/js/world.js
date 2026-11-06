'use strict';
// =====================================================================
// WORLD — a downtown avenue that runs to the horizon on one grid:
// road, sidewalks, crosswalk, facades, storefronts, trees, lamps,
// parked cars, a bus shelter, the billionaire's car and the reveal ring.
// =====================================================================

const WORLD = { destroyed: 0, total: 0 };

function worldUVBox(w, h, d, su, sv) {
  // BoxGeometry with UVs in metres / tile size, so facades tile at true scale
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), nz = Math.abs(n.getZ(i));
    const span = nx > 0.5 ? d : nz > 0.5 ? w : w;
    const vspan = Math.abs(n.getY(i)) > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * span / su, uv.getY(i) * vspan / sv);
  }
  return g;
}

function facadeTex(style) {
  // one tile = 2 bays x 1 floor (6m x 3.6m)
  return canvasTex(256, 154, (g, w, h) => {
    const R = mulberry32(100 + style);
    const wall = ['#b9ab97', '#8e8a84', '#c7c1b4', '#9a7a62', '#6f7880', '#d6d0c4'][style];
    noiseFill(g, w, h, wall, 0.08, 3, R);
    for (let b = 0; b < 2; b++) {
      const x0 = b * w / 2;
      if (style === 4) {                                   // curtain wall glass
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#5d7890'); gr.addColorStop(1, '#2c3c4c');
        g.fillStyle = gr; g.fillRect(x0 + 3, 6, w / 2 - 6, h - 12);
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x0 + 3, 6, w / 2 - 6, 18);
        continue;
      }
      const ww = style === 1 ? w / 2 - 22 : w / 2 * 0.52, wh = h * 0.56;
      const wx = x0 + (w / 2 - ww) / 2, wy = h * 0.2;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 10);
      const gr = g.createLinearGradient(0, wy, 0, wy + wh);
      gr.addColorStop(0, '#4a5d70'); gr.addColorStop(1, '#1f2832');
      g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
      if (R() < 0.3) { g.fillStyle = 'rgba(230,220,200,0.35)'; g.fillRect(wx, wy, ww, wh * 0.4); } // blind
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(wx, wy, ww, 5);
      g.fillStyle = wall; g.fillRect(wx + ww / 2 - 2, wy, 4, wh);              // mullion
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx - 6, wy + wh + 2, ww + 12, 5); // sill
    }
  }, { repeat: true });
}
function shopTex() {
  // one tile = one storefront 8m x 4.5m
  return canvasTex(2048, 288, (G, W, h) => {
    const R = mulberry32(77);
    const names = ['CAF\u00c9', 'PHARMACY', 'BOOKS', 'DELI'], signs = ['#d9c9a0', '#2f5a3a', '#7a2630', '#2b3a55'], ink = ['rgba(0,0,0,.6)', '#f3ede3', '#f3ede3', '#f3ede3'];
    noiseFill(G, W, h, '#3b3530', 0.1, 3, R);
    for (let k = 0; k < 4; k++) { const g = G; const w = 512; g.save(); g.translate(k * 512, 0);
    const gr = g.createLinearGradient(0, h * 0.35, 0, h);
    gr.addColorStop(0, '#2a3440'); gr.addColorStop(0.5, '#4a5560'); gr.addColorStop(1, '#1c2228');
    g.fillStyle = gr; g.fillRect(24, h * 0.36, w - 48, h * 0.62);
    // warm interior
    g.fillStyle = 'rgba(255,200,130,0.18)'; g.fillRect(40, h * 0.5, w - 80, h * 0.4);
    g.fillStyle = '#1a1a1a'; for (let i = 1; i < 4; i++) g.fillRect(24 + i * (w - 48) / 4 - 3, h * 0.36, 6, h * 0.62);
    g.fillStyle = signs[k]; g.fillRect(24, h * 0.12, w - 48, h * 0.16);       // sign band
    g.fillStyle = ink[k]; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
    g.fillText(names[k], w / 2, h * 0.24); g.restore(); }
  }, { repeat: true });
}

function buildWorld(scene) {
  WORLD.scene = scene;

  // ---- ground ---------------------------------------------------------------
  const asphalt = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#3d3f42', 0.16, 2);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + RNG() * 0.08})`;
      g.beginPath(); g.ellipse(RNG() * w, RNG() * h, 20 + RNG() * 60, 8 + RNG() * 30, RNG() * 3, 0, 7); g.fill(); }
  }, { repeat: true });
  asphalt.repeat.set(60, 60);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 }));
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; scene.add(road);

  const pave = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#a9a49b', 0.1, 2);
    g.strokeStyle = 'rgba(60,55,50,0.45)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
  }, { repeat: true });
  const paveMat = new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9 });
  const curbMat = stdMat('#b8b4ac', { roughness: 0.8 });
  const addWalk = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0;
    const g = worldUVBox(w, 0.16, d, 3, 3);
    const m = new THREE.Mesh(g, paveMat); m.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2);
    m.receiveShadow = true; scene.add(m);
  };
  for (const s of [1, -1]) {
    addWalk(-300, -6, s > 0 ? 7 : -12.6, s > 0 ? 12.6 : -7);
    addWalk(6, 300, s > 0 ? 7 : -12.6, s > 0 ? 12.6 : -7);
    // cross street sidewalks
    addWalk(s > 0 ? 6 : -12.6, s > 0 ? 12.6 : -6, 12.6, 300);
    addWalk(s > 0 ? 6 : -12.6, s > 0 ? 12.6 : -6, -300, -12.6);
  }
  // road markings
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.7 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd8b03a, roughness: 0.7 });
  const marks = [];
  for (let x = -300; x < 300; x += 9) if (x < -14 || x > 12) {
    marks.push({ m: paint, x: x + 2, z: 3.5, w: 3, d: 0.15 }); marks.push({ m: paint, x: x + 2, z: -3.5, w: 3, d: 0.15 });
  }
  marks.push({ m: yellow, x: -157, z: 0.12, w: 286, d: 0.12 }, { m: yellow, x: -157, z: -0.12, w: 286, d: 0.12 });
  marks.push({ m: yellow, x: 156, z: 0.12, w: 288, d: 0.12 }, { m: yellow, x: 156, z: -0.12, w: 288, d: 0.12 });
  for (let z = -6.4; z <= 6.4; z += 1.2) marks.push({ m: paint, x: -9.5, z, w: 3.4, d: 0.6 });   // zebra
  for (let x = -5.4; x <= 5.4; x += 1.2) { marks.push({ m: paint, x, z: 14.6, w: 0.6, d: 3.2 }); marks.push({ m: paint, x, z: -14.6, w: 0.6, d: 3.2 }); }
  marks.push({ m: paint, x: -12, z: 3.5, w: 0.4, d: 7 }, { m: paint, x: 12, z: -3.5, w: 0.4, d: 7 });
  for (const k of marks) {
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(k.w, k.d), k.m);
    mm.rotation.x = -Math.PI / 2; mm.position.set(k.x, 0.012, k.z); mm.receiveShadow = true; scene.add(mm);
  }

  // ---- buildings ------------------------------------------------------------
  const styles = [0, 1, 2, 3, 4, 5].map(s => ({ tex: facadeTex(s), list: [] }));
  const shops = [];
  const B = mulberry32(31337);
  const block = (x0, x1, z0, dirZ) => {
    let x = x0;
    while (x < x1 - 4) {
      const w = Math.min(x1 - x, 10 + B() * 16), d = 14 + B() * 10;
      const tall = Math.abs(x) < 120 ? 1 : 0.7;
      const h = (B() < 0.25 ? 40 + B() * 60 : 16 + B() * 26) * tall;
      const cx = x + w / 2, cz = z0 + dirZ * d / 2;
      const s = Math.floor(B() * 6);
      const tint = new THREE.Color().setHSL(0.08 + B() * 0.05, 0.05 + B() * 0.1, 0.85 + B() * 0.15);
      styles[s].list.push({ geo: worldUVBox(w, h - 4.5, d, 6, 3.6), color: tint, matrix: M4(cx, 4.5 + (h - 4.5) / 2, cz) });
      shops.push({ geo: worldUVBox(w, 4.5, d + 0.3, 32, 4.5), matrix: M4(cx, 2.25, cz - dirZ * 0.15) });
      // cornice
      styles[s].list.push({ geo: new THREE.BoxGeometry(w + 0.2, 0.5, d + 0.4), color: new THREE.Color(0.55, 0.52, 0.48), matrix: M4(cx, h, cz) });
      x += w + 0.05;
    }
  };
  for (const s of [1, -1]) { block(-320, -12.6, s * 12.6, s); block(12.6, 320, s * 12.6, s); }
  // cross-street frontages
  const cb = (xside, z0, z1) => {
    let z = z0;
    while (z < z1 - 4) {
      const d = Math.min(z1 - z, 12 + B() * 14), w = 16, h = 20 + B() * 50;
      const s = Math.floor(B() * 6), cx = xside * (12.6 + w / 2), cz = z + d / 2;
      styles[s].list.push({ geo: worldUVBox(w, h - 4.5, d, 6, 3.6), color: new THREE.Color(1, 0.97, 0.93), matrix: M4(cx, 4.5 + (h - 4.5) / 2, cz) });
      shops.push({ geo: worldUVBox(w + 0.3, 4.5, d, 32, 4.5), matrix: M4(cx, 2.25, cz) });
      z += d + 0.05;
    }
  };
  for (const xs of [1, -1]) { cb(xs, 12.7 + 14, 300); cb(xs, -300, -12.7 - 14); }
  for (const s of styles) {
    if (!s.list.length) continue;
    const m = new THREE.Mesh(mergeGeoms(s.list), new THREE.MeshStandardMaterial({ map: s.tex, vertexColors: true, roughness: 0.75, envMapIntensity: 0.4 }));
    m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  const shopMesh = new THREE.Mesh(mergeGeoms(shops), new THREE.MeshStandardMaterial({ map: shopTex(), roughness: 0.6 }));
  shopMesh.receiveShadow = shopMesh.castShadow = true; scene.add(shopMesh);

  // ---- awnings, trees, lamps -------------------------------------------------
  const props = [];
  const AW = ['#7a2630', '#2f5a3a', '#2b3a55', '#a85a32', '#3a3a3a'];
  for (let x = -150; x < 150; x += 8) for (const s of [1, -1]) {
    if (Math.abs(x) < 16 || B() < 0.45) continue;
    props.push({ geo: new THREE.BoxGeometry(6, 0.12, 1.6), color: new THREE.Color(rpick(AW, B)), matrix: M4(x, 3.6, s * 11.8, s * 0.28, 0, 0) });
  }
  const lampX = [];
  for (let x = -146; x < 150; x += 24) for (const s of [1, -1]) {
    const xx = x + (s > 0 ? 0 : 12);
    if (Math.abs(xx) < 14) continue;
    lampX.push([xx, s]);
    props.push({ geo: new THREE.CylinderGeometry(0.07, 0.1, 6.5, 6), color: new THREE.Color(0.16, 0.17, 0.18), matrix: M4(xx, 3.25, s * 7.5) });
    props.push({ geo: new THREE.BoxGeometry(0.12, 0.12, 1.6), color: new THREE.Color(0.16, 0.17, 0.18), matrix: M4(xx, 6.4, s * 6.8) });
    props.push({ geo: new THREE.BoxGeometry(0.5, 0.18, 0.3), color: new THREE.Color(0.2, 0.2, 0.2), matrix: M4(xx, 6.3, s * 6.1) });
  }
  // traffic signals at the intersection corners
  for (const [x, z] of [[-6.6, 7.4], [6.6, -7.4], [-12.2, -7.4], [12.2, 7.4]]) {
    props.push({ geo: new THREE.CylinderGeometry(0.09, 0.11, 3.6, 6), color: new THREE.Color(0.12, 0.12, 0.13), matrix: M4(x, 1.8, z) });
    props.push({ geo: new THREE.BoxGeometry(0.35, 1.0, 0.3), color: new THREE.Color(0.1, 0.1, 0.1), matrix: M4(x, 3.4, z) });
  }
  // bus shelter at x=-19.6, north sidewalk
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4c0, roughness: 0.1, transparent: true, opacity: 0.25 });
  props.push({ geo: new THREE.BoxGeometry(4.2, 0.12, 1.7), color: new THREE.Color(0.2, 0.22, 0.24), matrix: M4(-19.6, 2.5, 11.7) });
  for (const dx of [-2, 2]) props.push({ geo: new THREE.BoxGeometry(0.08, 2.5, 0.08), color: new THREE.Color(0.2, 0.22, 0.24), matrix: M4(-19.6 + dx, 1.25, 12.45) });
  props.push({ geo: new THREE.BoxGeometry(3, 0.08, 0.45), color: new THREE.Color(0.35, 0.3, 0.25), matrix: M4(-19.6, 0.62, 12.25) });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), glass); sg.position.set(-19.6, 1.3, 12.5); scene.add(sg);
  const propMesh = new THREE.Mesh(mergeGeoms(props), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  propMesh.castShadow = propMesh.receiveShadow = true; scene.add(propMesh);

  // trees in sidewalk pits (instanced)
  const treeSpots = [];
  for (let x = -142; x < 150; x += 12) for (const s of [1, -1]) {
    const xx = x + (s > 0 ? 6 : 0);
    if (Math.abs(xx) < 15 || Math.abs(xx + 19.6) < 4 || Math.abs(xx - 2) < 4) continue;
    treeSpots.push([xx + B() * 1.5, s * 7.7]);
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.17, 3.4, 6), stdMat('#4a3a2c'), treeSpots.length);
  const crownG = new THREE.IcosahedronGeometry(1.9, 1);
  const crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), treeSpots.length * 2);
  const c = new THREE.Color();
  treeSpots.forEach(([x, z], i) => {
    trunk.setMatrixAt(i, M4(x, 1.7, z));
    for (let k = 0; k < 2; k++) {
      const sc = 0.8 + B() * 0.5;
      crown.setMatrixAt(i * 2 + k, M4(x + (k ? 0.6 : -0.4), 4.3 + k * 0.9, z + (k ? 0.3 : -0.3), B(), B(), 0, sc, sc * 0.85, sc));
      crown.setColorAt(i * 2 + k, c.setHSL(0.25 + B() * 0.06, 0.4, 0.26 + B() * 0.08));
    }
  });
  for (const m of [trunk, crown]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }

  // ---- cars -----------------------------------------------------------------
  const carGeo = (len, col) => {
    const parts = [
      { geo: new THREE.BoxGeometry(len, 0.62, 1.8), color: col, matrix: M4(0, 0.62, 0) },
      { geo: new THREE.BoxGeometry(len * 0.52, 0.52, 1.64), color: new THREE.Color(0.08, 0.1, 0.12), matrix: M4(-len * 0.04, 1.18, 0) },
      { geo: new THREE.BoxGeometry(len * 0.5, 0.06, 1.66), color: col, matrix: M4(-len * 0.04, 1.46, 0) },
    ];
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      parts.push({ geo: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), color: new THREE.Color(0.05, 0.05, 0.05),
                   matrix: M4(sx * len * 0.33, 0.34, sz * 0.84, Math.PI / 2, 0, 0) });
    for (const sz of [-0.6, 0.6]) parts.push({ geo: new THREE.BoxGeometry(0.05, 0.12, 0.3), color: new THREE.Color(2.5, 2.4, 2.0), matrix: M4(len / 2, 0.72, sz) });
    return mergeGeoms(parts);
  };
  const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 });
  const CARC = ['#8a1c1c', '#d8d8d4', '#1f2a3a', '#4a4f55', '#2a2a2a', '#7a7f86', '#264a7a', '#a8a090', '#3a5a40'];
  const parked = [];
  for (let x = -140; x < 140; x += 6.2) for (const s of [1, -1]) {
    if (Math.abs(x) < 16 || B() < 0.35) continue;
    if (s > 0 && x > -6 && x < 10) continue;            // the billionaire's spot stays free
    parked.push({ geo: carGeo(4.4 + B() * 0.5, new THREE.Color(rpick(CARC, B))), matrix: M4(x + B(), 0, s * 5.6, 0, s > 0 ? 0 : Math.PI, 0) });
  }
  const pm = new THREE.Mesh(mergeGeoms(parked), carMat); pm.castShadow = pm.receiveShadow = true; scene.add(pm);

  // the billionaire's car: long, black, gloss
  WORLD.bcar = new THREE.Mesh(carGeo(5.6, new THREE.Color(0.02, 0.02, 0.025)),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.8 }));
  WORLD.bcar.castShadow = true; scene.add(WORLD.bcar);

  // ---- the reveal ring ------------------------------------------------------
  // Additive gold ring on the pavement at radius revealR() around the first person:
  // the visible edge of the wave that turns numbers on (field.js revealR — must match).
  WORLD.ring = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uR: { value: 0 }, uA: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uR, uA; varying vec2 vP;
      void main(){ float r = length(vP); float d = r - uR;
        float edge = exp(-d*d/(2.0*2.2*2.2)) * 1.6;
        float wake = d < 0.0 ? exp(d/6.0) * 0.18 : 0.0;
        float a = (edge + wake) * uA * smoothstep(0.0, 3.0, uR);
        gl_FragColor = vec4(vec3(1.0,0.78,0.32) * a, 1.0); }`,
  }));
  WORLD.ring.rotation.x = -Math.PI / 2; WORLD.ring.position.set(REVEAL.ox, 0.18, REVEAL.oz);
  WORLD.ring.renderOrder = 2; scene.add(WORLD.ring);
}

function stepWorld(dt, t) { /* everything is a pure function of time */ }

function writeWorld(t) {
  const st = storyT(t);
  WORLD.bcar.position.set(billCarX(st), 0, BILL.stop.z);
  WORLD.bcar.visible = st > BILL.carStop - 9;
  const R = revealR(st);
  WORLD.ring.material.uniforms.uR.value = R;
  WORLD.ring.material.uniforms.uA.value = st > REVEAL.t0 ? 1.4 * (1 - smooth(14, 18, st)) : 0;
  WORLD.ring.visible = st > REVEAL.t0 && st < 18;
}
