'use strict';
// =====================================================================
// SETS — one hillside mansion, built as ten rooms laid out side by side.
// Each room is its own group at SET_X * index so the director can cut
// between them; a shared sky dome and painted horizon (hills, palms,
// the city below) follow the camera so no window ever looks into a void.
// =====================================================================

const SET_X = 90;
const SETS = {};

// ---------- textures ----------
function marbleTex(base = '#f3f0ea', vein = 'rgba(120,118,122,', seed = 3) {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = mulberry32(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${200 + r() * 40},${195 + r() * 40},${190 + r() * 40},0.05)`;
      g.fillRect(r() * w, r() * h, 20 + r() * 60, 20 + r() * 60);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      let x = r() * w, y = r() * h, a = r() * Math.PI * 2;
      const wd = 0.6 + r() * 2.6, al = 0.12 + r() * 0.3;
      g.strokeStyle = vein + al + ')'; g.lineWidth = wd;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 60; k++) {
        a += (r() - 0.5) * 0.5; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y);
      }
      g.stroke();
    }
  }, { repeat: true });
}
function oakTex() {
  return canvasTex(512, 1024, (g, w, h) => {
    const r = mulberry32(11);
    g.fillStyle = '#b07a4a'; g.fillRect(0, 0, w, h);
    const plank = 64;
    for (let px = 0; px < w; px += plank) {
      const tone = r() * 30 - 15;
      g.fillStyle = `rgb(${176 + tone},${122 + tone * 0.8},${74 + tone * 0.5})`; g.fillRect(px, 0, plank, h);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(90,52,24,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2;
        const x0 = px + r() * plank; g.beginPath(); g.moveTo(x0, 0);
        for (let y = 0; y <= h; y += 64) g.lineTo(x0 + Math.sin(y * 0.01 + k) * 4, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(60,35,18,0.5)'; g.fillRect(px, 0, 2, h);
      const cut = r() * h; g.fillRect(px, cut, plank, 2);
    }
  }, { repeat: true });
}
function tileTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e7f3f6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,140,160,0.45)'; g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  }, { repeat: true });
}
function photoTex(seed) {
  return canvasTex(256, 320, (g, w, h) => {
    const r = mulberry32(seed);
    const hue = r() * 360;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, `hsl(${hue},45%,72%)`); gr.addColorStop(1, `hsl(${hue + 40},40%,45%)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // two or three little smiling people (the family portrait)
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const x = w * (i + 0.5) / n, s = 0.7 + r() * 0.4;
      g.fillStyle = `hsl(${r() * 360},50%,45%)`; g.fillRect(x - 28 * s, h - 120 * s, 56 * s, 120 * s);
      g.fillStyle = '#e2b394'; g.beginPath(); g.arc(x, h - 150 * s, 30 * s, 0, 7); g.fill();
      g.strokeStyle = '#5a2a20'; g.lineWidth = 3; g.beginPath(); g.arc(x, h - 148 * s, 14 * s, 0.3, Math.PI - 0.3); g.stroke();
    }
  });
}
function artTex(seed) {
  return canvasTex(512, 640, (g, w, h) => {
    const r = mulberry32(seed);
    g.fillStyle = '#efe9df'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `hsla(${[18, 32, 200, 350, 45][i % 5]},${50 + r() * 30}%,${45 + r() * 25}%,0.85)`;
      g.beginPath(); g.arc(r() * w, r() * h, 60 + r() * 140, 0, 7); g.fill();
    }
  });
}

// ---------- painted horizon ----------
function horizonTex(night) {
  return canvasTex(4096, 1024, (g, w, h) => {
    const r = mulberry32(night ? 77 : 42);
    g.clearRect(0, 0, w, h);
    const ridge = (base, amp, f1, f2, ph) => x => base + Math.sin(x / w * Math.PI * 2 * f1 + ph) * amp + Math.sin(x / w * Math.PI * 2 * f2 + ph * 2) * amp * 0.45 + Math.sin(x / w * Math.PI * 2 * 23 + ph) * amp * 0.12;
    // city valley: everything below the near ridge
    const cg = g.createLinearGradient(0, 560, 0, h);
    if (night) { cg.addColorStop(0, '#141a2e'); cg.addColorStop(1, '#0b0e1a'); }
    else { cg.addColorStop(0, '#9a8796'); cg.addColorStop(0.4, '#6f6a80'); cg.addColorStop(1, '#4b4a5e'); }
    g.fillStyle = cg; g.fillRect(0, 560, w, h - 560);
    // city blocks + lights
    for (let i = 0; i < 2600; i++) {
      const y = 600 + Math.pow(r(), 0.8) * 420, x = r() * w, s = 2 + (y - 600) / 420 * 10;
      g.fillStyle = night ? `rgba(${30 + r() * 30},${34 + r() * 30},${60 + r() * 40},0.9)` : `rgba(${110 + r() * 60},${100 + r() * 50},${120 + r() * 50},0.7)`;
      g.fillRect(x, y - s * 1.5, s * (1 + r() * 2), s * 1.5);
    }
    const nL = night ? 9000 : 4200;
    for (let i = 0; i < nL; i++) {
      const y = 590 + Math.pow(r(), 0.7) * 430, x = r() * w;
      const warm = r() < 0.75;
      const a = night ? 0.6 + r() * 0.4 : 0.35 + r() * 0.5;
      g.fillStyle = warm ? `rgba(255,${190 + r() * 50},${110 + r() * 60},${a})` : `rgba(220,235,255,${a})`;
      const s = 1 + (y - 590) / 430 * 3 * r();
      g.fillRect(x, y, s, s);
    }
    // boulevards of light
    for (let k = 0; k < 14; k++) {
      let x = r() * w, y = 620 + r() * 380, a = (r() - 0.5) * 0.5;
      g.strokeStyle = night ? 'rgba(255,190,110,0.55)' : 'rgba(255,200,140,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 30; j++) { x += Math.cos(a) * 30; y += Math.sin(a) * 30; g.lineTo(x, y); } g.stroke();
    }
    // hills, far to near
    const layers = night
      ? [['#1d2238', 420, 40, 3, 7], ['#161a2b', 470, 50, 4, 5], ['#0f1220', 540, 36, 6, 3]]
      : [['#d8a28c', 410, 44, 3, 7], ['#b07f78', 465, 52, 4, 5], ['#6d5a5c', 545, 38, 6, 3]];
    layers.forEach(([c, base, amp, f1, f2], li) => {
      const fn = ridge(base, amp, f1, f2, li * 1.7 + 0.5);
      g.fillStyle = c; g.beginPath(); g.moveTo(0, li === 2 ? 600 : h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, fn(x));
      g.lineTo(w, li === 2 ? 600 : h); g.closePath(); g.fill();
      if (li < 2) {   // haze at the base of each far layer
        const hz = g.createLinearGradient(0, base - amp, 0, base + 160);
        hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, night ? 'rgba(20,24,44,0.6)' : 'rgba(240,190,160,0.55)');
        g.fillStyle = hz; g.fillRect(0, base - amp, w, 220);
      }
      if (li === 2) {
        // houses dotted along the near ridge, palms on top
        for (let i = 0; i < 160; i++) {
          const x = r() * w, y = fn(x) + 8 + r() * 40;
          g.fillStyle = night ? '#232838' : `hsl(30,${15 + r() * 15}%,${78 + r() * 12}%)`;
          g.fillRect(x, y - 10, 14 + r() * 14, 10);
          g.fillStyle = night ? 'rgba(255,200,120,0.95)' : 'rgba(255,214,150,0.5)';
          g.fillRect(x + 3, y - 7, 3, 3);
        }
        for (let i = 0; i < 70; i++) {
          const x = r() * w, y = fn(x) + 4, hh = 30 + r() * 40;
          g.strokeStyle = night ? '#0a0c16' : '#3c3032'; g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - hh / 2, x + 2, y - hh); g.stroke();
          g.fillStyle = g.strokeStyle;
          for (let f = 0; f < 7; f++) {
            const a = f / 7 * Math.PI * 2; g.beginPath(); g.ellipse(x + 2 + Math.cos(a) * 8, y - hh + Math.sin(a) * 3 + 2, 10, 2.4, a, 0, 7); g.fill();
          }
        }
      }
    });
  }, {});
}

const SKY_SHADER = {
  uniforms: { uSun: { value: new THREE.Vector3(0, 0.12, -1).normalize() }, uNight: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform float uNight; varying vec3 vD;
    void main(){
      vec3 d = normalize(vD); float el = d.y;
      float sd = max(dot(d, normalize(uSun)), 0.0);
      // golden hour (values are display-space; the sky is not tone mapped)
      vec3 zen = vec3(0.24,0.36,0.58), mid = vec3(0.86,0.62,0.55), hor = vec3(1.0,0.74,0.46);
      vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, el));
      c = mix(c, zen, smoothstep(0.12, 0.65, el));
      c += vec3(1.0,0.62,0.30) * pow(sd, 6.0) * 0.55 + vec3(1.0,0.85,0.6) * pow(sd, 60.0) * 0.6;
      c = mix(c, vec3(1.0,0.97,0.88), smoothstep(0.9993, 0.9997, sd));
      // night
      vec3 nz = vec3(0.025,0.035,0.085), nh = vec3(0.10,0.12,0.22);
      vec3 n = mix(nh, nz, smoothstep(0.0, 0.5, el));
      vec3 md = normalize(vec3(0.5, 0.45, -0.7));
      float m = max(dot(d, md), 0.0);
      n += vec3(0.85,0.9,1.0) * smoothstep(0.99955, 0.9997, m) + vec3(0.15,0.18,0.3) * pow(m, 30.0);
      float st = fract(sin(dot(floor(d.xz / max(0.05, d.y + 0.2) * 220.0), vec2(12.9898,78.233))) * 43758.5);
      n += vec3(step(0.9975, st)) * smoothstep(0.08, 0.3, el) * 0.8;
      c = mix(c, n, uNight);
      if (el < 0.0) c = mix(c, uNight > 0.5 ? vec3(0.04,0.05,0.09) : vec3(0.45,0.42,0.5), smoothstep(0.0, -0.08, el));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

function makeSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SKY_SHADER.uniforms), side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: SKY_SHADER.vertexShader, fragmentShader: SKY_SHADER.fragmentShader,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false;
  return sky;
}
function makeHorizon(tex) {
  const H = 300, R = 320;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  m.renderOrder = -9; m.frustumCulled = false;
  m.userData.yOff = 120 - H / 2;          // top of cylinder at +120 m above the floor
  return m;
}

// ---------- building blocks ----------
const M = {};
function initMaterials() {
  const mt = marbleTex('#e9e4dc', 'rgba(105,100,104,'); mt.repeat.set(2, 2);
  M.marble = new THREE.MeshStandardMaterial({ map: mt, roughness: 0.18, metalness: 0, envMapIntensity: 0.8 });
  const mt2 = marbleTex('#e4ddd2', 'rgba(120,108,98,', 9); mt2.repeat.set(1, 1);
  M.marbleWall = new THREE.MeshStandardMaterial({ map: mt2, roughness: 0.3, envMapIntensity: 0.6 });
  const ok = oakTex(); ok.repeat.set(3, 2);
  M.oak = new THREE.MeshStandardMaterial({ map: ok, roughness: 0.55, envMapIntensity: 0.5 });
  const ok2 = oakTex(); ok2.repeat.set(1, 1);
  M.oakSmall = new THREE.MeshStandardMaterial({ map: ok2, roughness: 0.5 });
  M.plaster = new THREE.MeshStandardMaterial({ color: '#d9c7b0', roughness: 0.92 });
  M.plasterWarm = new THREE.MeshStandardMaterial({ color: '#cdb497', roughness: 0.92 });
  M.ceiling = new THREE.MeshStandardMaterial({ color: '#e2d6c6', roughness: 0.95 });
  M.metal = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.35, metalness: 0.8 });
  M.brass = new THREE.MeshStandardMaterial({ color: '#c9a461', roughness: 0.25, metalness: 1.0 });
  M.chrome = new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.08, metalness: 1.0 });
  M.glass = new THREE.MeshStandardMaterial({ color: '#cfe3ea', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1.2 });
  M.mirror = new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.04, metalness: 1.0, envMapIntensity: 1.1 });
  M.sofa = new THREE.MeshStandardMaterial({ color: '#d9cfc0', roughness: 0.95 });
  M.sofaDark = new THREE.MeshStandardMaterial({ color: '#46505a', roughness: 0.95 });
  M.cushion = new THREE.MeshStandardMaterial({ color: '#c9864f', roughness: 0.95 });
  M.rug = new THREE.MeshStandardMaterial({ color: '#cbbba5', roughness: 1 });
  M.leaf = new THREE.MeshStandardMaterial({ color: '#3f6b35', roughness: 0.8 });
  M.pot = new THREE.MeshStandardMaterial({ color: '#d8cfc3', roughness: 0.7 });
  M.white = new THREE.MeshStandardMaterial({ color: '#f8f6f2', roughness: 0.4 });
  M.black = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.5 });
  M.linen = new THREE.MeshStandardMaterial({ color: '#f1ece3', roughness: 0.95 });
  M.duvet = new THREE.MeshStandardMaterial({ color: '#e9e3d7', roughness: 0.95 });
  M.stone = new THREE.MeshStandardMaterial({ color: '#b9ab97', roughness: 0.85 });
  const tt = tileTex(); tt.repeat.set(4, 10);
  M.tile = new THREE.MeshStandardMaterial({ map: tt, roughness: 0.4 });
  M.water = new THREE.MeshStandardMaterial({ color: '#1785a6', roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.88, envMapIntensity: 0.9 });
  M.warmLight = new THREE.MeshBasicMaterial({ color: '#ffe3b0' });
  M.bulb = new THREE.MeshBasicMaterial({ color: '#fff3d6' });
  M.crystal = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.85, envMapIntensity: 2.0, emissive: '#fff6e0', emissiveIntensity: 0.15 });
}

function add(g, mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
function box(g, w, h, d, mat, x, y, z, ry = 0) { return add(g, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, ry); }
function cyl(g, r1, r2, h, mat, x, y, z, seg = 20) { return add(g, new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat), x, y, z); }
function uvScale(mesh, sx, sy) {        // world-ish UVs for big boxes so textures do not stretch
  const uv = mesh.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true; return mesh;
}
function floor(g, w, d, mat, x = 0, z = 0, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m);
  uvScale(m, w / 3, d / 3); return m;
}
function wall(g, w, h, mat, x, y, z, ry, thick = 0.15) {
  const m = box(g, w, h, thick, mat, x, y, z, ry); uvScale(m, w / 3, h / 3); return m;
}
function glassWall(g, w, h, x, z, ry = 0, opts = {}) {
  const gg = new THREE.Group(); gg.position.set(x, 0, z); gg.rotation.y = ry; g.add(gg);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass); pane.position.y = h / 2; pane.renderOrder = 2; gg.add(pane);
  const n = Math.max(1, Math.round(w / (opts.panel || 2.2)));
  for (let i = 0; i <= n; i++) {
    if (opts.gap && i === opts.gap) continue;
    box(gg, 0.06, h, 0.08, M.metal, -w / 2 + w * i / n, h / 2, 0);
  }
  box(gg, w, 0.08, 0.1, M.metal, 0, h - 0.04, 0); box(gg, w, 0.05, 0.1, M.metal, 0, 0.025, 0);
  return gg;
}
function plant(g, x, z, s = 1) {
  cyl(g, 0.22 * s, 0.17 * s, 0.42 * s, M.pot, x, 0.21 * s, z);
  const r = mulberry32(Math.round(x * 13 + z * 7) + 5);
  for (let i = 0; i < 9; i++) {
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), M.leaf);
    lf.scale.set(0.5, 1.6, 0.25);
    const a = i / 9 * Math.PI * 2;
    lf.position.set(x + Math.cos(a) * 0.12 * s, (0.65 + r() * 0.35) * s, z + Math.sin(a) * 0.12 * s);
    lf.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6); lf.castShadow = true; g.add(lf);
  }
}
function palm(g, x, z, h = 6) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 8), new THREE.MeshStandardMaterial({ color: '#8b7358', roughness: 0.9 }));
  trunk.position.set(x, h / 2, z); trunk.rotation.z = 0.05; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.6, 4), M.leaf);
    fr.scale.set(1, 1, 0.15);
    fr.position.set(x + Math.cos(a) * 1.0, h - 0.25, z + Math.sin(a) * 1.0);
    fr.rotation.set(0, -a, 0); fr.rotateZ(Math.PI / 2 + 0.45); fr.castShadow = true;
    g.add(fr);
  }
}
function sofa(g, x, z, ry, w = 2.6, mat = M.sofa) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s);
  box(s, w, 0.42, 0.95, mat, 0, 0.21, 0);
  box(s, w, 0.42, 0.22, mat, 0, 0.62, -0.36);
  box(s, 0.22, 0.6, 0.95, mat, -w / 2 + 0.11, 0.3, 0); box(s, 0.22, 0.6, 0.95, mat, w / 2 - 0.11, 0.3, 0);
  for (let i = 0; i < 3; i++) box(s, w / 3 - 0.12, 0.14, 0.75, mat, -w / 3 + i * w / 3, 0.48, 0.05);
  box(s, 0.45, 0.38, 0.16, M.cushion, -w / 2 + 0.5, 0.68, -0.2).rotation.z = 0.15;
  return s;
}
function terrace(g, w, z, dir = -1) {          // a deck outside the glass so the view has depth
  floor(g, w + 10, 7, M.stone, 0, z + dir * 3.5, -0.02);
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(w + 10, 1.0), M.glass); rail.position.set(0, 0.5, z + dir * 6.8);
  g.add(rail);
  box(g, w + 10, 0.05, 0.06, M.metal, 0, 1.0, z + dir * 6.8);
  palm(g, -w / 2 - 1.5, z + dir * 5.2, 6.5); palm(g, w / 2 + 2.5, z + dir * 6.0, 7.5);
}
function ceilingLights(g, w, d, h, n = 3) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 12), M.warmLight);
    m.position.set(-w / 2 + w * (i + 0.5) / n, h - 0.01, 0); g.add(m);
  }
}
function frame(g, w, h, tex, x, y, z, ry) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; g.add(f);
  const inner = new THREE.Group(); f.add(inner);
  box(inner, w + 0.08, h + 0.08, 0.04, M.black, 0, 0, 0);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  pic.position.z = 0.022; inner.add(pic);
  // hung from a nail at the top, so it swings about the top edge
  inner.position.y = -h / 2; f.position.y += h / 2;
  return f;
}

// ---------- the ten rooms ----------
function buildSets(scene) {
  initMaterials();
  const mk = (name, i) => { const g = new THREE.Group(); g.position.set(i * SET_X, 0, 0); scene.add(g); SETS[name] = { g, origin: g.position.clone(), i }; return SETS[name]; };

  // 1. MARBLE BATHROOM — vanity on -z, window wall on +z
  {
    const S = mk('bath', 0), g = S.g;
    floor(g, 5, 5, M.marble);
    wall(g, 5, 3, M.marbleWall, 0, 1.5, -2.2, 0);
    wall(g, 4.6, 3, M.marbleWall, -2.4, 1.5, 0, Math.PI / 2);
    wall(g, 4.6, 3, M.marbleWall, 2.4, 1.5, 0, Math.PI / 2);
    box(g, 5, 0.1, 5, M.ceiling, 0, 3.05, 0);
    glassWall(g, 5, 3, 0, 2.3, 0);
    terrace(g, 5, 2.3, 1);
    // vanity
    box(g, 2.4, 0.08, 0.6, M.marble, 0, 0.88, -1.85);
    box(g, 2.3, 0.5, 0.55, M.oak, 0, 0.6, -1.86);
    cyl(g, 0.22, 0.18, 0.12, M.white, -0.55, 0.98, -1.85, 24); cyl(g, 0.22, 0.18, 0.12, M.white, 0.55, 0.98, -1.85, 24);
    box(g, 0.03, 0.22, 0.03, M.brass, -0.55, 1.05, -2.08); box(g, 0.03, 0.22, 0.03, M.brass, 0.55, 1.05, -2.08);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), M.mirror); mir.position.set(0, 1.62, -2.12); g.add(mir);
    S.mirror = mir;
    box(g, 2.1, 0.05, 0.05, M.brass, 0, 2.2, -2.11); box(g, 2.1, 0.05, 0.05, M.brass, 0, 1.05, -2.11);
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.bulb); b.position.set(-0.9 + i * 0.3, 2.28, -2.08); g.add(b); }
    // tub, towels, plant
    const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 6, 18), M.white); tub.rotation.z = Math.PI / 2; tub.scale.set(1, 1, 0.9);
    tub.position.set(-1.4, 0.32, 1.0); tub.rotation.y = 0.2; g.add(tub); tub.castShadow = true;
    box(g, 0.04, 0.8, 0.5, M.chrome, 2.32, 1.2, -0.4);
    box(g, 0.08, 0.7, 0.45, new THREE.MeshStandardMaterial({ color: '#e8dccb', roughness: 1 }), 2.26, 1.15, -0.4);
    plant(g, 1.9, 1.7, 1.3);
    const pl = new THREE.PointLight('#ffd9a8', 0.6, 6, 2); pl.position.set(0, 2.2, -1.5); g.add(pl);
  }

  // 2. KITCHEN — waterfall island, window wall on -z
  {
    const S = mk('kitchen', 1), g = S.g;
    floor(g, 9, 8, M.oak);
    glassWall(g, 9, 3.2, 0, -3.2, 0); terrace(g, 9, -3.2, -1);
    wall(g, 8, 3.2, M.plaster, 0, 1.6, 3.6, 0);
    wall(g, 7, 3.2, M.plaster, 4.4, 1.6, 0, Math.PI / 2);
    box(g, 9, 0.1, 8, M.ceiling, 0, 3.25, 0);
    // island: top + waterfall ends
    box(g, 2.8, 0.06, 1.1, M.marble, 0, 0.92, 0);
    box(g, 0.06, 0.92, 1.1, M.marble, -1.4, 0.46, 0); box(g, 0.06, 0.92, 1.1, M.marble, 1.4, 0.46, 0);
    box(g, 2.7, 0.86, 0.9, M.oak, 0, 0.45, -0.05);
    // back cabinets + hood
    box(g, 4, 0.9, 0.6, M.oakSmall, 0, 0.45, 3.2); box(g, 4, 0.05, 0.62, M.marble, 0, 0.92, 3.2);
    box(g, 4, 0.8, 0.4, M.oakSmall, 0, 2.3, 3.35);
    // stools
    for (const x of [-0.75, 0.75]) { cyl(g, 0.2, 0.2, 0.06, M.black, x, 0.72, 0.95); cyl(g, 0.02, 0.02, 0.7, M.chrome, x, 0.36, 0.95, 8); cyl(g, 0.18, 0.18, 0.02, M.chrome, x, 0.01, 0.95); }
    S.stool = { x: -0.0, z: 0.95, h: 0.75 };
    cyl(g, 0.2, 0.2, 0.06, M.black, 0, 0.72, 0.95); cyl(g, 0.02, 0.02, 0.7, M.chrome, 0, 0.36, 0.95, 8);
    // pendants
    for (const x of [-0.8, 0, 0.8]) {
      cyl(g, 0.004, 0.004, 1.2, M.black, x, 2.65, 0, 4);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.brass); sh.position.set(x, 2.05, 0); sh.rotation.x = Math.PI; g.add(sh);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.bulb); bl.position.set(x, 2.02, 0); g.add(bl);
    }
    const pl = new THREE.PointLight('#ffcf94', 0.7, 5, 2); pl.position.set(0, 1.9, 0); g.add(pl);
    // fruit bowl, espresso machine
    cyl(g, 0.18, 0.1, 0.08, M.white, 0.85, 0.99, -0.15);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), stdMat(['#f2a33a', '#e8432f', '#f6d43c', '#7cbf3b'][i])); f.position.set(0.85 + Math.cos(i * 1.7) * 0.07, 1.06, -0.15 + Math.sin(i * 1.7) * 0.07); g.add(f); }
    box(g, 0.4, 0.4, 0.35, M.chrome, -1.2, 1.15, 3.2);
    // espresso cup + saucer (moved by the story)
    const cup = new THREE.Group(); g.add(cup);
    const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, side: THREE.DoubleSide })); cm.position.y = 0.03; cup.add(cm);
    const cb = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), M.white); cb.rotation.x = -Math.PI / 2; cb.position.y = 0.001; cup.add(cb);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.032, 18), new THREE.MeshStandardMaterial({ color: '#5a3018', roughness: 0.3 })); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.048; cup.add(coffee);
    const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), M.white); hnd.position.set(0.042, 0.032, 0); cup.add(hnd);
    S.cup = cup; S.coffee = coffee;
    const saucer = cyl(g, 0.065, 0.05, 0.01, M.white, 0, 0.955, 0.32, 24);
    S.saucer = saucer;
    plant(g, 3.6, -2.4, 1.6);
  }

  // 3. FRONT HALL — big pivot door on -z
  {
    const S = mk('hall', 2), g = S.g;
    floor(g, 7, 8, M.marble);
    wall(g, 7, 4.5, M.plasterWarm, 0, 2.25, -3, 0);
    wall(g, 8, 4.5, M.plasterWarm, -3.2, 2.25, 0, Math.PI / 2); wall(g, 8, 4.5, M.plasterWarm, 3.2, 2.25, 0, Math.PI / 2);
    wall(g, 7, 4.5, M.plasterWarm, 0, 2.25, 3.6, 0);
    box(g, 7, 0.1, 8, M.ceiling, 0, 4.5, 0);
    // pivot door
    box(g, 1.6, 3.2, 0.12, M.oak, 0, 1.6, -2.9); box(g, 0.04, 1.2, 0.08, M.brass, 0.6, 1.3, -2.82);
    // glass slots beside the door
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.2), new THREE.MeshBasicMaterial({ color: '#ffd8a8' })); sl.position.set(-1.2, 1.6, -2.92); g.add(sl);
    const sl2 = sl.clone(); sl2.position.x = 1.2; g.add(sl2);
    // console + round mirror
    box(g, 1.6, 0.06, 0.4, M.marble, -2.9, 0.85, -0.4, Math.PI / 2); box(g, 1.5, 0.8, 0.35, M.oakSmall, -2.95, 0.42, -0.4, Math.PI / 2);
    const rm = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), M.mirror); rm.position.set(-3.1, 1.75, -0.4); rm.rotation.y = Math.PI / 2; g.add(rm);
    const rmf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 40), M.brass); rmf.position.copy(rm.position); rmf.rotation.y = Math.PI / 2; g.add(rmf);
    plant(g, 2.6, -2.4, 1.5); plant(g, -2.6, 2.8, 1.2);
    // sunglasses (positioned by the story)
    const sg = new THREE.Group(); g.add(sg);
    const lensM = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.1, metalness: 0.5, envMapIntensity: 0.3 });
    for (const sd of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), lensM); l.position.set(sd * 0.035, 0, 0); sg.add(l);
      const l2 = l.clone(); l2.rotation.y = Math.PI; sg.add(l2);
      const arm = boxm(0.004, 0.006, 0.14, '#111'); arm.position.set(sd * 0.066, 0.008, -0.07); sg.add(arm);
    }
    const br = boxm(0.02, 0.005, 0.005, '#111'); br.position.y = 0.012; sg.add(br);
    S.glasses = sg;
    const pl = new THREE.PointLight('#ffd6a0', 0.8, 8, 2); pl.position.set(0, 3.6, 0); g.add(pl);
    // pendant
    const pend = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffdca0', emissiveIntensity: 0.9 })); pend.position.set(0, 3.6, 0.3); g.add(pend);
  }

  // 4. LIVING ROOM — sofa facing the glass on -z
  {
    const S = mk('living', 3), g = S.g;
    floor(g, 10, 9, M.oak);
    glassWall(g, 10, 3.4, 0, -3.4, 0); terrace(g, 10, -3.4, -1);
    wall(g, 10, 3.4, M.plaster, 0, 1.7, 3.8, 0); wall(g, 8, 3.4, M.plaster, -4.6, 1.7, 0, Math.PI / 2);
    box(g, 10, 0.1, 9, M.ceiling, 0, 3.45, 0);
    floor(g, 4, 3, M.rug, 0, 1.2, 0.005);
    sofa(g, 0, 2.5, Math.PI, 3.0);
    box(g, 1.2, 0.35, 0.7, M.marble, 0, 0.18, 1.2);
    frame(g, 1.2, 1.5, artTex(4), -1.7, 1.2, 3.72, Math.PI);
    plant(g, -3.8, -2.6, 1.7); plant(g, 2.2, 3.2, 1.3);
    const fl = cyl(g, 0.02, 0.02, 1.6, M.brass, 2.4, 0.8, 1.8, 8);
    const fls = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.3, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#fff0d8', emissive: '#ffd8a0', emissiveIntensity: 0.6, side: THREE.DoubleSide })); fls.position.set(2.4, 1.7, 1.8); g.add(fls);
    // tape measure (set by the story)
    const tape = new THREE.Mesh(new THREE.BoxGeometry(1, 0.004, 0.02), new THREE.MeshStandardMaterial({ color: '#f6c919', roughness: 0.5, metalness: 0.2 }));
    g.add(tape); S.tape = tape;
    const tcase = boxm(0.07, 0.07, 0.035, '#f6c919'); g.add(tcase); S.tcase = tcase;
    const pl = new THREE.PointLight('#ffd6a0', 0.5, 7, 2); pl.position.set(2.4, 1.9, 1.8); g.add(pl);
  }

  // 5. GALLERY HALLWAY — runs along z, photos on the +x wall, doorway at z = 3
  {
    const S = mk('hallway', 4), g = S.g;
    floor(g, 2.6, 14, M.oak, 0, 0);
    wall(g, 14, 3, M.plasterWarm, 1.25, 1.5, 0, Math.PI / 2); wall(g, 14, 3, M.plasterWarm, -1.25, 1.5, 0, Math.PI / 2);
    box(g, 2.6, 0.1, 14, M.ceiling, 0, 3.05, 0);
    // doorway wall at z = 3 with a 0.95 m opening
    wall(g, 0.8, 3, M.plasterWarm, -0.88, 1.5, 3, 0); wall(g, 0.8, 3, M.plasterWarm, 0.88, 1.5, 3, 0);
    wall(g, 0.96, 0.85, M.plasterWarm, 0, 2.58, 3, 0);
    box(g, 0.05, 2.15, 0.2, M.oakSmall, -0.48, 1.075, 3); box(g, 0.05, 2.15, 0.2, M.oakSmall, 0.48, 1.075, 3); box(g, 1.0, 0.05, 0.2, M.oakSmall, 0, 2.15, 3);
    // room beyond the door
    floor(g, 6, 6, M.oak, 0, 6); wall(g, 6, 3, M.plaster, 0, 1.5, 8.6, 0);
    glassWall(g, 6, 3, 3.0, 6, Math.PI / 2);
    sofa(g, -1.5, 7.6, Math.PI, 2.2, M.sofaDark);
    plant(g, 2, 8, 1.4);
    S.frames = [];
    for (let i = 0; i < 4; i++) {
      const f = frame(g, 0.5, 0.62, photoTex(20 + i), 1.16, 1.32, -3.5 + i * 1.5, -Math.PI / 2);
      S.frames.push(f);
    }
    for (let i = 0; i < 3; i++) frame(g, 0.6, 0.45, photoTex(40 + i), -1.16, 1.4, -2.8 + i * 1.8, Math.PI / 2);
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12), M.warmLight); l.position.set(0, 3.0, -5 + i * 2.2); g.add(l); }
    const pl = new THREE.PointLight('#ffd6a0', 0.7, 7, 2); pl.position.set(0, 2.7, -1.5); g.add(pl);
    const pl2 = new THREE.PointLight('#ffd6a0', 0.5, 7, 2); pl2.position.set(0, 2.7, 1.5); g.add(pl2);
  }

  // 6. DINING — long table along z
  {
    const S = mk('dining', 5), g = S.g;
    floor(g, 10, 9, M.oak);
    glassWall(g, 10, 3.4, 0, -3.6, 0); terrace(g, 10, -3.6, -1);
    wall(g, 10, 3.4, M.plaster, 0, 1.7, 3.8, 0); wall(g, 8, 3.4, M.plaster, 4.2, 1.7, 0, Math.PI / 2); wall(g, 8, 3.4, M.plaster, -4.2, 1.7, 0, Math.PI / 2);
    box(g, 10, 0.1, 9, M.ceiling, 0, 3.45, 0);
    box(g, 1.15, 0.06, 3.2, M.oak, 0, 0.76, 0);
    for (const [x, z] of [[-0.45, -1.4], [0.45, -1.4], [-0.45, 1.4], [0.45, 1.4]]) box(g, 0.07, 0.73, 0.07, M.black, x, 0.365, z);
    S.tableH = 0.79;
    // chairs
    const chair = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); box(c, 0.46, 0.05, 0.46, M.sofaDark, 0, 0.46, 0); box(c, 0.46, 0.5, 0.05, M.sofaDark, 0, 0.72, -0.22); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(c, 0.03, 0.46, 0.03, M.black, a, 0.23, b); };
    chair(-0.85, 0.2, Math.PI / 2); chair(0.85, 0.45, -Math.PI / 2); chair(0.85, -0.45, -Math.PI / 2); chair(0, 1.95, Math.PI); chair(-0.85, -0.9, Math.PI / 2);
    // place settings
    const plate = (x, z) => { cyl(g, 0.13, 0.12, 0.015, M.white, x, 0.8, z, 24); };
    plate(-0.35, 0.2); plate(0.35, 0.45); plate(0.35, -0.45); plate(0, 1.3);
    for (const [x, z] of [[-0.3, 0.45], [0.3, 0.7], [0.3, -0.2], [0.2, 1.3]]) {
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.12, 14, 1, true), M.glass); gl.position.set(x, 0.85, z); g.add(gl);
    }
    for (const z of [-0.9, 0.9]) { cyl(g, 0.012, 0.015, 0.25, M.white, 0.05, 0.92, z, 8); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffc46b' })); fl.position.set(0.05, 1.06, z); g.add(fl); }
    // salad bowl, bread
    cyl(g, 0.2, 0.12, 0.1, M.white, 0, 0.84, -0.9);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.leaf); f.position.set(Math.cos(i) * 0.1, 0.9, -0.9 + Math.sin(i) * 0.1); g.add(f); }
    // chandelier bar
    box(g, 0.1, 0.06, 2.2, M.brass, 0, 2.3, 0);
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.bulb); b.position.set(0, 2.24, -0.9 + i * 0.45); g.add(b); }
    cyl(g, 0.005, 0.005, 1.1, M.black, 0, 2.9, -0.8, 4); cyl(g, 0.005, 0.005, 1.1, M.black, 0, 2.9, 0.8, 4);
    const pl = new THREE.PointLight('#ffcf94', 0.8, 6, 2); pl.position.set(0, 2.1, 0); g.add(pl);
    frame(g, 1.6, 1.1, artTex(9), 0, 1.6, 3.72, Math.PI);
    // napkin (draped over the tip by the story)
    const nap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.95, side: THREE.DoubleSide }));
    nap.castShadow = true; g.add(nap); S.napkin = nap;
  }

  // 7. FLOATING STAIRCASE + CRYSTAL CHANDELIER — stairs climb along +x against the z=-1.1 wall
  {
    const S = mk('stairs', 6), g = S.g;
    floor(g, 10, 9, M.marble);
    wall(g, 10, 6.5, M.plasterWarm, 0, 3.25, -1.2, 0);
    wall(g, 9, 6.5, M.plasterWarm, -4.2, 3.25, 2.5, Math.PI / 2);
    glassWall(g, 9, 6.5, 0, 5.5, Math.PI); terrace(g, 9, 5.5, 1);
    box(g, 10, 0.1, 9, M.ceiling, 0, 6.55, 2.5);
    const N = 16, RISE = 0.19, RUN = 0.3, X0 = -2.4;
    S.stairY = x => clamp(Math.ceil((x - X0) / RUN), 0, N) * RISE;
    for (let i = 0; i < N; i++) {
      const x = X0 + RUN * (i + 0.5);
      box(g, RUN + 0.02, 0.07, 1.1, M.oak, x, RISE * (i + 1) - 0.035, -0.6);
    }
    // landing
    box(g, 2.6, 0.1, 1.1, M.oak, X0 + RUN * N + 1.3, RISE * N - 0.05, -0.6);
    // balusters: thin bars at z = 0.0, a gap every 0.13 m
    const balG = new THREE.CylinderGeometry(0.012, 0.012, 0.95, 6);
    const bal = new THREE.InstancedMesh(balG, M.metal, 60); bal.frustumCulled = false;
    const m4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 60; i++) {
      const x = X0 + 0.1 + i * 0.13; if (x > X0 + RUN * N + 2.4) break;
      const y = (x < X0 + RUN * N ? clamp(Math.ceil((x - X0) / RUN), 0, N) * RISE : RISE * N);
      m4.makeTranslation(x, y + 0.475, -0.04); bal.setMatrixAt(k++, m4);
    }
    bal.count = k; bal.castShadow = true; g.add(bal);
    // handrail along the slope
    const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(RUN * N, RISE * N) + 0.1, 0.04, 0.05), M.metal);
    rail.position.set(X0 + RUN * N / 2, RISE * N / 2 + 0.97, -0.04); rail.rotation.z = Math.atan2(RISE, RUN); g.add(rail);
    box(g, 2.6, 0.04, 0.05, M.metal, X0 + RUN * N + 1.3, RISE * N + 0.97, -0.04);
    // chandelier: rings of crystal drops
    const ch = new THREE.Group(); ch.position.set(0.9, 4.3, 1.25); g.add(ch);
    cyl(ch, 0.005, 0.005, 2.2, M.brass, 0, 1.1, 0, 4);
    const crystals = [];
    const cg = new THREE.OctahedronGeometry(0.04, 0); cg.scale(0.7, 1.6, 0.7);
    const rings = [[0.55, 0, 22], [0.42, -0.25, 18], [0.3, -0.5, 14], [0.17, -0.72, 9]];
    for (const [rad, y, n] of rings) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.012, 6, 40), M.brass); tor.rotation.x = Math.PI / 2; tor.position.y = y; ch.add(tor);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        for (let d = 0; d < 2; d++) {
          const c = new THREE.Mesh(cg, M.crystal);
          c.position.set(Math.cos(a) * rad, y - 0.07 - d * 0.1, Math.sin(a) * rad);
          ch.add(c); crystals.push({ m: c, home: c.position.clone(), a, rad, y: y - 0.07 - d * 0.1 });
        }
      }
    }
    for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.bulb); const a = i / 8 * Math.PI * 2; b.position.set(Math.cos(a) * 0.42, -0.2, Math.sin(a) * 0.42); ch.add(b); }
    S.chand = ch; S.crystals = crystals;
    const pl = new THREE.PointLight('#ffe2b4', 1.0, 9, 2); pl.position.set(0.9, 3.8, 1.25); g.add(pl);
    plant(g, -3.4, 4.5, 1.8);
    sofa(g, -1.8, 3.6, Math.PI / 2, 2.4, M.sofa);
  }

  // 8. BEDROOM, NIGHT — bed head on -z, balcony door on +z
  {
    const S = mk('bed', 7), g = S.g;
    floor(g, 8, 7, M.oak);
    wall(g, 8, 3.2, M.plasterWarm, 0, 1.6, -1.9, 0);
    wall(g, 7, 3.2, M.plasterWarm, -3.8, 1.6, 1.2, Math.PI / 2); wall(g, 7, 3.2, M.plasterWarm, 3.8, 1.6, 1.2, Math.PI / 2);
    box(g, 8, 0.1, 7, M.ceiling, 0, 3.25, 1.2);
    glassWall(g, 8, 3.2, 0, 2.6, 0, { gap: 2 });
    // balcony
    floor(g, 8, 3, M.stone, 0, 4.1, 0.0);
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.0), M.glass); rail.position.set(0, 0.5, 5.5); rail.rotation.y = Math.PI; g.add(rail);
    box(g, 8, 0.05, 0.06, M.metal, 0, 1.0, 5.5);
    // bed: base, mattress, duvet, pillows, headboard
    box(g, 2.0, 0.3, 2.2, M.oakSmall, 0, 0.15, -0.6);
    box(g, 1.9, 0.25, 2.1, M.linen, 0, 0.42, -0.6);
    const duv = box(g, 1.98, 0.24, 1.6, M.duvet, 0, 0.66, -0.18); S.duvet = duv;
    box(g, 2.1, 1.1, 0.12, M.sofaDark, 0, 0.75, -1.75);
    for (const x of [-0.48, 0.48]) { const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 4, 12), M.white); p.rotation.z = Math.PI / 2; p.position.set(x, 0.62, -1.62); p.scale.set(1, 0.8, 0.6); g.add(p); }
    // bedside lamps
    for (const x of [-1.35, 1.35]) {
      box(g, 0.5, 0.5, 0.45, M.oakSmall, x, 0.25, -1.5);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#fff0d8', emissive: '#ffc070', emissiveIntensity: 0.9, side: THREE.DoubleSide })); sh.position.set(x, 0.85, -1.5); g.add(sh);
      cyl(g, 0.015, 0.015, 0.3, M.brass, x, 0.62, -1.5, 6);
    }
    S.lamp = new THREE.PointLight('#ffb36b', 0.55, 4.5, 2); S.lamp.position.set(1.35, 0.95, -1.4); g.add(S.lamp);
    S.moon = new THREE.PointLight('#7f9cff', 0.35, 12, 2); S.moon.position.set(-1.5, 2.8, 4.5); g.add(S.moon);
    // the little pillow on the balcony
    const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 4, 12), new THREE.MeshStandardMaterial({ color: '#f2b8c6', roughness: 1 }));
    pil.rotation.z = Math.PI / 2; pil.scale.set(1, 1, 0.55); pil.position.set(0, 0.07, 3.55); pil.castShadow = true; g.add(pil); S.pillow = pil;
    plant(g, 3.0, 4.6, 1.3); plant(g, -3.2, -1.2, 1.4);
  }

  // 9. OPEN-PLAN KITCHEN -> LIVING
  {
    const S = mk('open', 8), g = S.g;
    floor(g, 12, 12, M.oak, 0, 1.5);
    glassWall(g, 12, 3.4, -4.5, 1.5, Math.PI / 2); terrace(g, 1, -4.5, -1);
    wall(g, 12, 3.4, M.plaster, 4.8, 1.7, 1.5, Math.PI / 2);
    wall(g, 10, 3.4, M.plaster, 0, 1.7, -3.2, 0); wall(g, 10, 3.4, M.plaster, 0, 1.7, 6.6, 0);
    box(g, 10, 0.1, 10, M.ceiling, 0, 3.45, 1.5);
    // island at z = -1.2 (Marcus behind it)
    box(g, 2.6, 0.06, 1.0, M.marble, 0, 0.92, -1.0);
    box(g, 0.06, 0.92, 1.0, M.marble, -1.3, 0.46, -1.0); box(g, 0.06, 0.92, 1.0, M.marble, 1.3, 0.46, -1.0);
    box(g, 2.5, 0.86, 0.85, M.oak, 0, 0.45, -1.0);
    box(g, 4, 0.9, 0.6, M.oakSmall, 0, 0.45, -2.8); box(g, 4, 0.8, 0.4, M.oakSmall, 0, 2.3, -2.95);
    // living area: sofa facing -z, its back toward +z
    S.sofaZ = 4.3;
    sofa(g, 0, 4.3, Math.PI, 3.0, M.sofa);
    floor(g, 4, 3.4, M.rug, 0, 3.6, 0.005);
    box(g, 1.0, 0.33, 0.6, M.marble, 1.8, 0.17, 2.6);
    plant(g, -3.6, 5.6, 1.7); plant(g, 3.8, -2.4, 1.4);
    // fairy lights: instanced bulbs placed by the story
    const fb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.034, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 120);
    fb.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(120 * 3), 3);
    fb.frustumCulled = false; g.add(fb); S.fairy = fb;
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#2a3a1e' })); g.add(wire); S.wire = wire;
    const pl = new THREE.PointLight('#ffd6a0', 0.6, 8, 2); pl.position.set(0, 2.8, 1.5); g.add(pl);
  }

  // 10. INFINITY POOL at sunset — pool runs along z, view off the -z edge
  {
    const S = mk('pool', 9), g = S.g;
    const PW = 3.6, Z0 = -5.6, Z1 = 4.6;
    // deck around the pool (a frame of slabs)
    box(g, 12, 0.1, 4, M.stone, 0, -0.05, Z1 + 2);            // house side
    box(g, 4, 0.1, Z1 - Z0 + 0.5, M.stone, -PW / 2 - 2, -0.05, (Z0 + Z1) / 2);
    box(g, 4, 0.1, Z1 - Z0 + 0.5, M.stone, PW / 2 + 2, -0.05, (Z0 + Z1) / 2);
    // pool basin
    const basin = box(g, PW, 1.4, Z1 - Z0, M.tile, 0, -0.8, (Z0 + Z1) / 2); basin.material = M.tile;
    basin.geometry = new THREE.BoxGeometry(PW, 1.4, Z1 - Z0); basin.geometry.scale(1, 1, 1);
    // render basin as an inside: use BackSide so we see the walls from inside
    basin.material = new THREE.MeshStandardMaterial({ map: M.tile.map, roughness: 0.4, side: THREE.BackSide });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, Z1 - Z0 + 0.3), M.water); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.06, (Z0 + Z1) / 2 - 0.15); g.add(water);
    S.water = water;
    // infinity edge: the wall drops away at z0
    box(g, PW + 8, 3, 0.3, M.stone, 0, -1.6, Z0 - 0.15);
    box(g, PW, 0.04, 0.12, M.stone, 0, -0.1, Z0 - 0.05);
    // a towel roll on a small ledge where the tip rests
    box(g, 1.2, 0.08, 0.6, M.stone, 0, -0.04, Z0 - 0.5);
    const tow = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 12), new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 1 })); tow.rotation.z = Math.PI / 2; tow.position.set(0, 0.09, Z0 - 0.45); g.add(tow); S.towel = tow;
    // house glass behind Marcus, loungers, palms
    box(g, 12, 0.1, 12, M.stone, 0, -0.05, Z1 + 9);     // more deck behind Marcus (the house is behind the camera)
    for (const z of [-2, 0.5]) { const l = new THREE.Group(); l.position.set(-PW / 2 - 1.4, 0, z); g.add(l); box(l, 0.7, 0.12, 1.9, M.white, 0, 0.3, 0); box(l, 0.7, 0.1, 0.7, M.white, 0, 0.55, -0.8).rotation.x = 0.7; }
    palm(g, PW / 2 + 2.6, -3.5, 7); palm(g, -PW / 2 - 2.8, -4.4, 8.5); palm(g, PW / 2 + 3.2, 2.5, 6);
    plant(g, PW / 2 + 1.2, Z1 + 1.0, 1.6); plant(g, -PW / 2 - 1.2, Z1 + 1.0, 1.6);
    for (let i = 0; i < 6; i++) { const lt = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#9ff2ff' })); lt.position.set(i % 2 ? PW / 2 - 0.01 : -PW / 2 + 0.01, -0.35, Z0 + 1.5 + Math.floor(i / 2) * 3); g.add(lt); }
    S.Z0 = Z0; S.Z1 = Z1;
  }
}
