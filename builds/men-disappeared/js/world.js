'use strict';
// =====================================================================
// WORLD — the beach. x runs along the shore, +z is out to sea, y is up.
// "You" sit on a towel at the origin facing +z. The shoreline is at
// z = SHORE; sand, boardwalk and town run to the horizon both ways so no
// shot ends in a void. Static geometry is merged into a handful of
// vertex-coloured meshes to keep draw calls low.
// =====================================================================

const SHORE = 30;            // waterline (z)
const T_EVENT = 6.0;         // the instant every man disappears (story time)
const WORLD = { props: {}, anim: [] };

const C = (h) => new THREE.Color(h);
const VCOL = () => stdMat(0xffffff, { vertexColors: true, roughness: 0.8 });

function sandTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#ffffff', 0.10, 3);
    const r = mulberry32(99);
    for (let i = 0; i < 1800; i++) {               // footprints / ripples
      g.fillStyle = `rgba(120,95,60,${0.03 + r() * 0.05})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 5, 1 + r() * 3, r() * 3, 0, 7); g.fill();
    }
  }, { repeat: true });
}

function buildWorld(scene) {
  // ---------------- sand ----------------
  // One big subdivided plane; vertex colour darkens toward the wet band at the waterline.
  const sandGeo = new THREE.PlaneGeometry(2400, 260, 240, 130);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, SHORE + 6 - 130);
  const p = sandGeo.attributes.position, col = [];
  const dry = C(0xcfa56c), wet = C(0x8f7350), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    // gentle dunes inland, slope down into the water past the shore
    let y = 0;
    if (z > SHORE - 4) y = -(z - (SHORE - 4)) * 0.09;
    if (z < -20) y = Math.max(0, (-20 - z) * 0.04) + 0.4 * Math.sin(x * 0.05) * smooth(-20, -40, z);
    p.setY(i, y);
    const w = smooth(SHORE - 6, SHORE - 1, z);
    tmp.copy(dry).lerp(wet, w);
    const n = 0.94 + 0.06 * hash1(Math.floor(x * 0.7) * 13.1 + Math.floor(z * 0.7));
    col.push(tmp.r * n, tmp.g * n, tmp.b * n);
  }
  sandGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sandGeo.computeVertexNormals();
  const st = sandTexture(); st.repeat.set(300, 32);
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: st, roughness: 1 }));
  sand.receiveShadow = true;
  scene.add(sand);

  // ---------------- water ----------------
  scene.add(buildWater());

  // ---------------- boardwalk + town to the horizon ----------------
  const parts = [];
  const add = (geo, color, m) => parts.push({ geo, color: C(color), matrix: m });
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  // deck
  add(BOX, 0x9c7550, M4(0, 0.9, -40, 0, 0, 0, 2400, 0.25, 8));
  for (let x = -1200; x <= 1200; x += 4) {
    add(BOX, 0x7a5a3c, M4(x, 0.45, -36.2, 0, 0, 0, 0.25, 0.9, 0.25));          // piles
    add(BOX, 0xece6da, M4(x, 1.5, -36.2, 0, 0, 0, 0.12, 1.0, 0.12));           // rail posts
  }
  add(BOX, 0xf5f1e8, M4(0, 1.98, -36.2, 0, 0, 0, 2400, 0.1, 0.14));             // rail
  add(BOX, 0xa38a6a, M4(0, 0.2, -45, 0, 0, 0, 2400, 0.4, 2));                  // kerb/promenade
  // snack stands every 26 m along the boardwalk, awnings in bright stripes
  const awn = [0xe8463c, 0x2f8fd8, 0xf2b630, 0x37b37e, 0xec6aa0];
  for (let x = -520, k = 0; x <= 520; x += 26, k++) {
    if (Math.abs(x) < 4) continue;
    add(BOX, 0xf3efe6, M4(x, 2.2, -41, 0, 0, 0, 5, 2.6, 3.2));
    add(BOX, awn[k % awn.length], M4(x, 3.75, -39.2, 0.35, 0, 0, 5.6, 0.12, 1.8));
    add(BOX, 0x3b3b40, M4(x, 2.0, -39.35, 0, 0, 0, 4.2, 1.2, 0.1));            // counter window
  }
  // hotels / apartments behind, on one grid to the horizon both ways
  const bcol = [0xf2e8d8, 0xe9d8c0, 0xdfe7ea, 0xf0d6c8, 0xd8e4d4, 0xf4f0e6];
  const R = mulberry32(31);
  for (let row = 0; row < 3; row++) {
    for (let x = -1150; x < 1150; x += 22 + R() * 10) {
      const h = (row === 0 ? 8 : 14) + R() * (row === 0 ? 10 : 34);
      const w = 14 + R() * 8, d = 12 + R() * 6;
      const z = -60 - row * 34 - R() * 8;
      add(BOX, bcol[Math.floor(R() * bcol.length)], M4(x, h / 2, z, 0, 0, 0, w, h, d));
      // balcony bands give scale
      for (let y = 3.2; y < h - 1; y += 3.2) add(BOX, 0x9aa4ad, M4(x, y, z + d / 2 + 0.15, 0, 0, 0, w * 0.92, 0.35, 0.3));
    }
  }
  // distant headland at both ends so the curve of the bay closes the frame
  add(new THREE.SphereGeometry(1, 16, 8), 0x7d8f6a, M4(-900, -60, 420, 0, 0, 0, 420, 140, 260));
  add(new THREE.SphereGeometry(1, 16, 8), 0x84956f, M4(950, -70, 520, 0, 0, 0, 380, 150, 240));
  // palms along the promenade
  for (let x = -600; x <= 600; x += 18) {
    const ph = 7 + hash1(x) * 3, lean = (hash1(x + 3) - 0.5) * 0.25;
    add(new THREE.CylinderGeometry(0.16, 0.28, ph, 6), 0x8a6d4c, M4(x + 7, ph / 2, -47, 0, 0, lean));
    for (let f = 0; f < 7; f++) {
      const a = f / 7 * Math.PI * 2;
      add(BOX, 0x3f7d3a, M4(x + 7 + Math.sin(lean) * -ph + Math.cos(a) * 1.4, ph - 0.2, -47 + Math.sin(a) * 1.4,
        0, -a, 0.45, 3.2, 0.08, 0.7));
    }
  }
  const town = new THREE.Mesh(mergeGeoms(parts), VCOL());
  town.receiveShadow = true;
  scene.add(town);

  // ---------------- beach furniture ----------------
  const fp = [];
  const fadd = (geo, color, m) => fp.push({ geo, color: C(color), matrix: m });
  const umb = [0xe8463c, 0xf7f3ea, 0x2f8fd8, 0xf2b630, 0x37b37e, 0xec6aa0, 0xff8a3d];
  const towel = [0xe8463c, 0x2f8fd8, 0xf2b630, 0x37b37e, 0xec6aa0, 0x7d5bd6, 0xffffff, 0x20b2aa];
  const cone = new THREE.ConeGeometry(1.25, 0.55, 10, 1, true);
  const pole = new THREE.CylinderGeometry(0.025, 0.025, 2.3, 5);
  const UMBRELLAS = [];
  const UR = mulberry32(77);
  for (let i = 0; i < 70; i++) {
    const x = (UR() - 0.5) * 200, z = -30 + UR() * 52;
    if (Math.hypot(x, z) < 9) continue;                     // keep the POV corridor clear
    if (Math.abs(x) < 9 && z > 0 && z < 26) continue;
    if (x > -12 && x < 1 && z > 10 && z < 22) continue;     // volleyball court
    UMBRELLAS.push([x, z]);
    const tilt = (UR() - 0.5) * 0.3;
    fadd(pole, 0xdddddd, M4(x, 1.15, z, tilt, 0, 0));
    fadd(cone, umb[i % umb.length], M4(x, 2.35, z - tilt * 1.1, tilt, UR() * 3, 0));
    fadd(BOX, towel[i % towel.length], M4(x + 0.9, 0.02, z + 0.8, 0, UR() * 3, 0, 0.9, 0.03, 1.8));
  }
  // your towel and the couple's towel
  fadd(BOX, 0x2f8fd8, M4(0, 0.02, 0.3, 0, 0, 0, 1.0, 0.03, 1.9));
  fadd(BOX, 0xffffff, M4(0, 0.035, 0.3, 0, 0, 0, 1.02, 0.01, 0.12));
  fadd(BOX, 0xec6aa0, M4(1.7, 0.02, 6.0, 0, 0.1, 0, 1.9, 0.03, 2.0));
  // volleyball net, along z at x = -6
  fadd(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), 0xeeeeee, M4(-6, 1.25, 12.5));
  fadd(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), 0xeeeeee, M4(-6, 1.25, 19.5));
  fadd(BOX, 0xffffff, M4(-6, 2.38, 16, 0, 0, 0, 0.03, 0.07, 7));
  fadd(BOX, 0xffffff, M4(-6, 1.68, 16, 0, 0, 0, 0.03, 0.05, 7));
  // court lines
  for (const [x, z, w, d] of [[-6, 11, 16, 0.08], [-6, 21, 16, 0.08], [-14, 16, 0.08, 10], [2, 16, 0.08, 10]])
    fadd(BOX, 0x2a6fd0, M4(x, 0.012, z, 0, 0, 0, w, 0.01, d));
  // lifeguard tower at (-14, 24)
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]])
    fadd(BOX, 0xf3f0ea, M4(-14 + dx, 1.3, 24 + dz, 0, 0, 0, 0.16, 2.6, 0.16));
  fadd(BOX, 0xe8463c, M4(-14, 2.65, 24, 0, 0, 0, 2.4, 0.15, 2.4));                  // deck
  fadd(BOX, 0xf3f0ea, M4(-14, 3.45, 23.2, 0, 0, 0, 2.2, 1.5, 0.12));                // back wall
  fadd(BOX, 0xe8463c, M4(-14, 4.35, 24, 0, 0, 0, 2.7, 0.14, 2.7));                  // roof
  fadd(BOX, 0xf3f0ea, M4(-14, 3.0, 25.1, 0, 0, 0, 2.2, 0.5, 0.08));                 // front rail
  for (let k = 0; k < 6; k++) fadd(BOX, 0xd8d2c6, M4(-14, 0.35 + k * 0.38, 26 + k * 0.12, 0.3, 0, 0, 0.9, 0.05, 0.3)); // ladder
  fadd(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), 0xdddddd, M4(-12.6, 5.4, 23.2));
  fadd(BOX, 0xe8463c, M4(-12.1, 6.1, 23.2, 0, 0, 0, 1.0, 0.6, 0.03));               // red flag
  fadd(BOX, 0xffffff, M4(-14, 3.3, 22.9, 0, 0, 0, 1.6, 0.35, 0.02));                 // sign
  fadd(BOX, 0xe8463c, M4(-14, 3.3, 22.88, 0, 0, 0, 0.3, 0.2, 0.02));
  // the lifeguard's chair
  fadd(BOX, 0xf2b630, M4(-14, 3.05, 23.9, 0, 0, 0, 0.6, 0.06, 0.55));
  fadd(BOX, 0xf2b630, M4(-14, 3.35, 23.62, -0.2, 0, 0, 0.6, 0.6, 0.06));
  // grill at (3.5, 11)
  fadd(BOX, 0x2b2b2e, M4(3.5, 0.92, 11, 0, 0, 0, 1.0, 0.35, 0.55));
  fadd(BOX, 0x1d1d20, M4(3.5, 1.11, 11, 0, 0, 0, 0.95, 0.03, 0.5));
  for (const [dx, dz] of [[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.2], [0.42, 0.2]])
    fadd(BOX, 0x555558, M4(3.5 + dx, 0.38, 11 + dz, 0, 0, 0, 0.05, 0.76, 0.05));
  fadd(BOX, 0xe9e2d0, M4(4.6, 0.38, 11.2, 0, 0, 0, 0.8, 0.76, 0.5));               // side table
  for (let k = 0; k < 4; k++)                                                        // burgers
    fadd(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), 0x5a3420, M4(3.25 + (k % 2) * 0.25, 1.14, 10.9 + (k >> 1) * 0.2));
  // sandcastle at (-1.5, 22)
  fadd(new THREE.CylinderGeometry(0.5, 0.65, 0.4, 10), 0xd9b98a, M4(-1.5, 0.2, 22));
  fadd(new THREE.CylinderGeometry(0.22, 0.26, 0.45, 8), 0xd9b98a, M4(-1.5, 0.62, 22));
  for (const a of [0, 1.57, 3.14, 4.71])
    fadd(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 6), 0xd4b383, M4(-1.5 + Math.cos(a) * 0.48, 0.55, 22 + Math.sin(a) * 0.48));
  fadd(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 8), 0xf2b630, M4(-0.6, 0.11, 21.5));  // bucket
  // coolers, bags, chairs dotted around
  const CR = mulberry32(5);
  for (let i = 0; i < 40; i++) {
    const x = (CR() - 0.5) * 160, z = -28 + CR() * 48;
    if (Math.hypot(x, z) < 8 || (Math.abs(x) < 8 && z > 0 && z < 28)) continue;
    if (i % 2) fadd(BOX, umb[i % umb.length], M4(x, 0.22, z, 0, CR() * 3, 0, 0.6, 0.44, 0.4));
    else {
      fadd(BOX, towel[i % towel.length], M4(x, 0.35, z, -0.5, CR() * 3, 0, 0.55, 0.05, 1.1));
    }
  }
  const furn = new THREE.Mesh(mergeGeoms(fp), VCOL());
  furn.castShadow = true; furn.receiveShadow = true;
  scene.add(furn);

  // ---------------- boats offshore ----------------
  const boatParts = [];
  for (const [x, z, s, c] of [[-70, 150, 1.4, 0xffffff], [110, 230, 2.2, 0xf7f3ea], [-210, 320, 3, 0xe8463c]]) {
    boatParts.push({ geo: BOX, color: C(c), matrix: M4(x, 0.6 * s, z, 0, 0.4, 0, 6 * s, 1.2 * s, 2.2 * s) });
    boatParts.push({ geo: BOX, color: C(0x2f3d4c), matrix: M4(x - s, 1.6 * s, z, 0, 0.4, 0, 2.4 * s, 1 * s, 1.6 * s) });
    boatParts.push({ geo: new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 8 * s, 4), color: C(0xeeeeee), matrix: M4(x + s, 4.5 * s, z) });
    boatParts.push({ geo: new THREE.ConeGeometry(2 * s, 6 * s, 3), color: C(0xffffff), matrix: M4(x + 2 * s, 4.5 * s, z, 0, 0.4, 0, 0.6, 1, 0.1) });
  }
  WORLD.boats = new THREE.Mesh(mergeGeoms(boatParts), VCOL());
  scene.add(WORLD.boats);

  buildDynamicProps(scene);
}

// ---------------- the water ----------------
// Display-space shader: shallow turquoise to deep blue, fresnel toward the sky, a sun glint
// path, and foam bands rolling up the shore. Writes display colour directly (no tone map).
function buildWater() {
  const geo = new THREE.PlaneGeometry(3000, 1600, 200, 120);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.02, SHORE - 3 + 800);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uShore: { value: SHORE }, uFog: { value: new THREE.Color(0xcfe2ee) },
                uSun: { value: new THREE.Vector3(0, 1, 0) } },
    transparent: true,
    vertexShader: `
      uniform float uT; uniform float uShore; varying vec3 vW; varying float vFoam;
      void main(){
        vec3 p = (modelMatrix * vec4(position,1.0)).xyz;
        float d = p.z - uShore;
        float sw = sin(p.x*0.11 + uT*0.9 + p.z*0.31) * 0.06 + sin(p.x*0.37 - uT*1.7 + p.z*0.12) * 0.03;
        float roll = sin(d*0.55 - uT*1.6);
        p.y += sw * smoothstep(-2.0, 8.0, d) + 0.12*max(roll,0.0)*smoothstep(0.0,4.0,d)*(1.0-smoothstep(10.0,30.0,d));
        // the water's edge creeps up and down the sand
        vW = p; vFoam = roll;
        gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: `
      uniform float uT; uniform float uShore; uniform vec3 uFog; uniform vec3 uSun;
      varying vec3 vW; varying float vFoam;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float d = vW.z - uShore;
        vec3 V = normalize(cameraPosition - vW);
        // ripple normal from noise
        vec2 q = vW.xz*0.35 + vec2(uT*0.3, uT*0.2);
        float e = 0.1;
        float a = n2(q), bx = n2(q+vec2(e,0)), bz = n2(q+vec2(0,e));
        vec3 N = normalize(vec3((a-bx)*1.6, 1.0, (a-bz)*1.6));
        float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        vec3 shallow = vec3(0.36, 0.80, 0.80), deep = vec3(0.07, 0.33, 0.55);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 45.0, d));
        col = mix(col, vec3(0.74, 0.86, 0.95), fres*0.75);
        // sun glint
        vec3 R = reflect(-V, N);
        float g = pow(max(dot(R, normalize(uSun)), 0.0), 220.0);
        col += vec3(1.0, 0.95, 0.85) * g * 1.4;
        // foam: shore wash + breaking rows
        float wash = 1.0 - smoothstep(0.0, 2.2 + 1.2*sin(uT*0.8 + vW.x*0.05), d);
        float rows = smoothstep(0.75, 0.98, vFoam) * smoothstep(1.0, 4.0, d) * (1.0 - smoothstep(10.0, 24.0, d));
        float fn = n2(vW.xz*vec2(0.9, 2.4) + uT*0.4);
        float foam = clamp(wash*0.85 + rows*(0.4+0.6*fn), 0.0, 1.0) * smoothstep(0.25, 0.6, fn + wash*0.4);
        col = mix(col, vec3(0.97, 0.98, 0.97), foam);
        float alpha = mix(0.82, 1.0, smoothstep(0.0, 6.0, d));
        // haze toward the horizon
        float dist = length(cameraPosition - vW);
        col = mix(col, uFog, 1.0 - exp(-dist * 0.0021));
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  WORLD.water = m;
  return m;
}

// ---------------- props that react to the event ----------------
function buildDynamicProps(scene) {
  const P = WORLD.props;
  // volleyball
  P.ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), stdMat(0xfaf6e8, { roughness: 0.6 }));
  P.ball.castShadow = true; scene.add(P.ball);
  // cooler (carried by a man walking across the POV)
  const cool = new THREE.Group();
  const cb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.38), stdMat(0x2f8fd8)); cool.add(cb);
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.4), stdMat(0xffffff)); cl.position.y = 0.21; cool.add(cl);
  cb.castShadow = true; P.cooler = cool; scene.add(cool);
  // spatula
  const sp = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.32), stdMat(0x5a3a22)); sh.position.z = -0.16; sp.add(sh);
  const sb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), stdMat(0xbfc4c8, { metalness: 0.6, roughness: 0.4 }));
  sb.position.z = 0.05; sp.add(sb);
  P.spatula = sp; scene.add(sp);
  // frisbee
  P.frisbee = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 14), stdMat(0xf2b630));
  scene.add(P.frisbee);
  // binoculars on the lifeguard tower
  P.bino = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.12), stdMat(0x222222)); scene.add(P.bino);
  // surfboard
  P.board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 2.2), stdMat(0xffffff, { roughness: 0.4 }));
  scene.add(P.board);
  // jet ski
  const js = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 2.9), stdMat(0xf7f3ea, { roughness: 0.35 }));
  hull.position.y = 0.25; js.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.34, 0.8), stdMat(0xf7f3ea, { roughness: 0.35 }));
  nose.rotation.set(-0.3, Math.PI / 4, 0, 'YXZ'); nose.scale.set(1, 1, 1); nose.position.set(0, 0.3, 1.45); js.add(nose);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 2.9), stdMat(0xe8463c)); stripe.position.y = 0.36; js.add(stripe);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 1.2), stdMat(0x1d1d22)); seat.position.set(0, 0.58, -0.35); js.add(seat);
  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), stdMat(0x1d1d22)); bars.position.set(0, 0.95, 0.55); js.add(bars);
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.2), stdMat(0x1d1d22)); col.position.set(0, 0.75, 0.55); col.rotation.x = -0.4; js.add(col);
  js.traverse(o => { if (o.isMesh) o.castShadow = true; });
  P.jetski = js; scene.add(js);
  // spray behind the jet ski + the splash when it hits the shallows
  const N = 260;
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  P.spray = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
  P.spray.frustumCulled = false; scene.add(P.spray);
  // grill smoke
  const smokeTex = puffTexture();
  P.smoke = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x888888, transparent: true, depthWrite: false, opacity: 0 }));
    scene.add(s); P.smoke.push(s);
  }
}

// ---------------- prop motion: pure functions of story time ----------------
const JS_SPEED = 7.2, JS_X = 6.5, JS_Z0 = 150;
const JS_BEACH_T = (JS_Z0 - (SHORE + 1)) / JS_SPEED;           // ≈ 16.5 s: hits the shallows

function jetskiState(t) {
  // Straight run in toward the shore. Before the event it weaves a little (a rider steering);
  // after, the throttle stays locked and it ploughs on, rudderless, until the sand stops it.
  const weave = t < T_EVENT ? Math.sin(t * 0.9) * 1.6 : Math.sin(T_EVENT * 0.9) * 1.6 + (t - T_EVENT) * 0.12;
  let z = JS_Z0 - JS_SPEED * t, x = JS_X + weave, y = 0, pitch = 0, roll = 0;
  let yaw = Math.PI + (t < T_EVENT ? Math.cos(t * 0.9) * 0.1 : 0.02 * Math.min(1, (t - T_EVENT)));
  let speed = JS_SPEED;
  if (t > JS_BEACH_T) {
    const u = t - JS_BEACH_T;
    const slide = 4.2 * (1 - Math.exp(-u * 2.0));               // decelerates up the slope
    z = SHORE + 1 - slide; speed = JS_SPEED * Math.exp(-u * 2.0);
    pitch = -0.18 * Math.exp(-u * 1.2) * Math.sin(u * 9) - 0.06 * smooth(0, 0.8, u);
    roll = 0.1 * smooth(0, 1, u);
    x = JS_X + Math.sin(T_EVENT * 0.9) * 1.6 + (JS_BEACH_T - T_EVENT) * 0.12 + slide * 0.05;
    y = Math.max(0, -(z - (SHORE - 4)) * 0.09) * 0 + 0.05 * smooth(0, 1, u);
  } else {
    y = 0.05 * Math.sin(t * 5.3) + 0.02;
    pitch = 0.05 * Math.sin(t * 3.1) - 0.04; roll = 0.04 * Math.sin(t * 2.3);
  }
  return { x, y, z, yaw, pitch, roll, speed };
}

function ballistic(p0, v0, t, rest = 0.45, ground = 0, fr = 0.9) {
  // Integrate a bouncing body from (p0, v0); deterministic, a pure function of t.
  const p = p0.clone(), v = v0.clone(); let tt = 0; const h = 1 / 240;
  while (tt < t) {
    v.y -= 9.81 * h; p.addScaledVector(v, h); tt += h;
    if (p.y < ground) { p.y = ground; if (v.y < 0) { v.y = -v.y * rest; v.x *= fr; v.z *= fr; if (Math.abs(v.y) < 0.4) v.y = 0; } }
    if (p.y <= ground + 1e-4 && v.y === 0) { v.multiplyScalar(Math.exp(-6 * h)); }
  }
  return p;
}

function boardState(t) {
  const szBase = 52;
  const z = t < T_EVENT ? szBase - t * 1.2 : szBase - T_EVENT * 1.2 - (1 - Math.exp(-(t - T_EVENT) * 0.5)) * 2.4;
  return { x: -28 + Math.sin(t * 0.4) * 0.4, y: 0.06 + 0.06 * Math.sin(t * 2.1), z,
           yaw: 0.5 + (t > T_EVENT ? (t - T_EVENT) * 0.08 : 0) };
}
function coolerCarry(p, t) {
  const b = p.behave(t);
  return new THREE.Vector3(b.x + Math.sin(b.h) * 0.36, (b.y || 0) + b.P.hipH - 0.12 * p.s, b.z + Math.cos(b.h) * 0.36);
}

const _v = new THREE.Vector3();
function writeProps(t) {
  const P = WORLD.props;
  // ---- volleyball: rallies over the net at x = -6; at the event it is lobbed high toward
  // the man's side, and nobody is there to play it.
  const per = 2.2;
  if (t < T_EVENT - 0.3) {
    const k = Math.floor(t / per), u = (t % per) / per;
    const fromX = k % 2 ? -2.6 : -9.4, toX = k % 2 ? -9.4 : -2.6;
    const fz = 15 + (k % 3) * 1.3, tz = 15.6 + ((k + 1) % 3) * 1.2;
    P.ball.position.set(lerp(fromX, toX, u), 1.9 + 3.2 * 4 * u * (1 - u), lerp(fz, tz, u));
  } else {
    // the lob: set at T_EVENT-1.1 from the woman at (-2.6, 18), heading up for the man to spike
    const t0 = T_EVENT - 0.3;
    const p0 = _v.set(-2.6, 1.9, 18);
    const v0 = new THREE.Vector3(0.04, 12.5, -1.0);
    P.ball.position.copy(ballistic(p0, v0, t - t0, 0.5, 0.11));
  }
  P.ball.rotation.set(t * 3, t * 2, 0);

  // ---- cooler: carried at hand height by the man walking along z = 8, dropped at the event
  const cm = PEOPLE.byName.cooler;
  const ch = coolerCarry(cm, Math.min(t, T_EVENT));
  if (t < T_EVENT) { P.cooler.position.copy(ch); P.cooler.rotation.set(0, cm.headingAt(t), 0); }
  else {
    const dt = t - T_EVENT, fallT = Math.sqrt(2 * (ch.y - 0.19) / 9.81);
    const vx = cm.walkVel.x * 0.9, vz = cm.walkVel.z * 0.9;
    const tt = Math.min(dt, fallT);
    P.cooler.position.set(ch.x + vx * tt, Math.max(0.19, ch.y - 0.5 * 9.81 * tt * tt), ch.z + vz * tt);
    const land = smooth(fallT, fallT + 0.25, dt);
    P.cooler.rotation.set(0.0, cm.headingAt(T_EVENT) + 0.25 * land, -0.12 * land * Math.exp(-(dt - fallT) * 3) * Math.sin((dt - fallT) * 20));
  }

  // ---- spatula: in the griller's hand, then it clatters off the grill onto the sand
  const gm = PEOPLE.byName.griller;
  if (t < T_EVENT) {
    gm.handWorld(P.spatula.position, 'r');
    P.spatula.rotation.set(-0.3 + 0.25 * Math.sin(t * 3.4), Math.PI + gm.root.rotation.y + Math.PI, 0);
  } else {
    gm.handWorld(_v, 'r', T_EVENT);
    const dt = t - T_EVENT;
    const p = ballistic(_v.clone(), new THREE.Vector3(0.25, 0.6, -0.5), dt, 0.25, 0.02);
    P.spatula.position.copy(p);
    const fall = smooth(0, 0.7, dt);
    P.spatula.rotation.set(lerp(-0.3, -Math.PI / 2 + 0.05, fall), 0.6 * fall, fall * 1.4);
  }

  // ---- frisbee: in flight between two men; lands on its own
  const f0 = new THREE.Vector3(-22, 1.3, 4), f1 = new THREE.Vector3(-30, 1.3, 9);
  const fp = 2.6;
  if (t < T_EVENT) {
    const k = Math.floor(t / fp), u = (t % fp) / fp;
    const a = k % 2 ? f1 : f0, b = k % 2 ? f0 : f1;
    P.frisbee.position.lerpVectors(a, b, u); P.frisbee.position.y += Math.sin(u * Math.PI) * 0.9;
    P.frisbee.rotation.set(0.1, t * 20, 0.15);
  } else {
    const k = Math.floor(T_EVENT / fp), u0 = (T_EVENT % fp) / fp;
    const a = k % 2 ? f1 : f0, b = k % 2 ? f0 : f1;
    const p0 = new THREE.Vector3().lerpVectors(a, b, u0); p0.y += Math.sin(u0 * Math.PI) * 0.9;
    const dir = b.clone().sub(a).multiplyScalar(1 / fp);
    const dt = t - T_EVENT, glide = 1 - Math.exp(-dt * 0.8);
    const fall = Math.min(dt * 0.55, p0.y - 0.02);
    P.frisbee.position.set(p0.x + dir.x * glide / 0.8, p0.y - Math.max(0, fall), p0.z + dir.z * glide / 0.8);
    P.frisbee.rotation.set(0.1 * Math.exp(-dt), t * 20 * Math.exp(-dt * 0.7), 0.15 * Math.exp(-dt));
  }

  // ---- binoculars: in the lifeguard's hands, then dropped on the tower deck
  const lg = PEOPLE.byName.lifeguard;
  if (t < T_EVENT) { lg.handWorld(P.bino.position, 'l'); P.bino.rotation.set(0, Math.PI, 0); }
  else {
    lg.handWorld(_v, 'l', T_EVENT);
    P.bino.position.copy(ballistic(_v.clone(), new THREE.Vector3(0, 0.3, 0.2), t - T_EVENT, 0.2, 2.76));
    P.bino.rotation.set(0, Math.PI + smooth(T_EVENT, T_EVENT + 0.6, t) * 0.8, 0);
  }

  // ---- surfboard: the surfer rides a small wave in; after the event it washes about alone
  const B = boardState(t);
  P.board.position.set(B.x, B.y, B.z);
  P.board.rotation.set(0.04 * Math.sin(t * 1.7), B.yaw, 0.05 * Math.sin(t * 2.3), 'YXZ');

  // ---- jet ski
  const J = jetskiState(t);
  P.jetski.position.set(J.x, J.y, J.z);
  P.jetski.rotation.set(J.pitch, J.yaw, J.roll, 'YXZ');
  // spray: a fan of droplets thrown back from the stern while it moves, plus a burst at beaching
  const sp = P.spray.geometry.attributes.position, n = sp.count;
  for (let i = 0; i < n; i++) {
    const life = 0.9, born = t - ((i / n) * life + hash1(i) * 0.05);
    const age = t - born;
    const bs = jetskiState(born);
    let px, py, pz;
    if (i < n * 0.7) {
      const side = (hash1(i * 3.1) - 0.5) * 2;
      const sv = bs.speed / JS_SPEED;
      px = bs.x + side * 0.6 + side * age * 1.6 * sv;
      pz = bs.z + 1.6 + age * 3.0 * sv;
      py = Math.max(-0.5, 0.2 + (2.6 * sv * (0.5 + hash1(i * 7.7))) * age - 4.9 * age * age);
      if (sv < 0.05) py = -5;
    } else {
      const u = t - JS_BEACH_T;
      if (u < 0 || u > 1.6) { px = 0; py = -5; pz = 0; }
      else {
        const a = hash1(i * 1.7) * Math.PI * 2, r = hash1(i * 2.9);
        px = JS_X + 1.1 + Math.cos(a) * r * 3 * u; pz = SHORE + 1 + Math.sin(a) * r * 2 * u - 1;
        py = Math.max(-0.5, (3 + 3 * r) * u - 4.9 * u * u);
      }
    }
    sp.setXYZ(i, px, py, pz);
  }
  sp.needsUpdate = true;

  // ---- grill smoke: a thin wisp while he flips, thick and dark once nobody is there
  const burn = smooth(T_EVENT + 0.5, T_EVENT + 7, t);
  P.smoke.forEach((s, i) => {
    const per = 3.2, ph = (t / per + i / P.smoke.length) % 1;
    const age = ph * per;
    const drift = age * age * 0.08;
    s.position.set(3.4 + Math.sin(i * 7.1) * 0.15 + drift * 1.2, 1.25 + age * 0.9, 11 + Math.cos(i * 3.3) * 0.1 + drift * 0.5);
    const sz = 0.2 + age * (0.25 + burn * 0.35);
    s.scale.set(sz, sz, 1);
    const g = lerp(0.62, 0.3, burn);
    s.material.color.setRGB(g, g, g * 0.98);
    s.material.opacity = (0.12 + burn * 0.4) * Math.sin(ph * Math.PI) * (t < 0 ? 0 : 1);
  });
}
