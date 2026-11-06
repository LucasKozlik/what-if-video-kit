'use strict';
// =====================================================================
// MAIN — renderer, deterministic film clock, camera, HUD, export modes.
//   ?shot=41   render one frame at 41 s, then set title to SHOT_READY
//   ?t=30      start playback at 30 s
//   ?cam=x,y,z&look=x,y,z&fov=50   override the camera (world coords)
//   ?render=1  offline export: window.renderFrameAt(n)
// The whole film is a pure function of t, so seeking is free.
// =====================================================================

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot') ? parseFloat(Q.get('shot')) : null;
const START = parseFloat(Q.get('t') || '0');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: SHOT != null || Q.has('render') });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.physicallyCorrectLights = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 9 / 16, 0.03, 2000);

// sky + painted horizon, one day and one night version
const sky = makeSky(); scene.add(sky);
const dayHorizon = horizonTex(false), nightHorizon = horizonTex(true);
const horizon = makeHorizon(dayHorizon); scene.add(horizon);

// image-based lighting baked from that sky
const pmrem = new THREE.PMREMGenerator(renderer);
function bakeEnv(night, sunDir) {
  const es = new THREE.Scene();
  const s2 = makeSky(); s2.material.uniforms.uNight.value = night ? 1 : 0; s2.material.uniforms.uSun.value.copy(sunDir);
  es.add(s2);
  const h2 = makeHorizon(night ? nightHorizon : dayHorizon); h2.position.y = -5; es.add(h2);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: night ? '#141824' : '#b89a88' }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = -1.6; es.add(fl);
  return pmrem.fromScene(es, 0.02).texture;
}
const ENV_DAY = bakeEnv(false, new THREE.Vector3(-0.2, 0.12, -1).normalize());
const ENV_NIGHT = bakeEnv(true, new THREE.Vector3(0.5, 0.45, -0.7).normalize());

const hemi = new THREE.HemisphereLight('#ffe6cc', '#6b5a4c', 0.75); scene.add(hemi);
const amb = new THREE.AmbientLight('#ffffff', 0.12); scene.add(amb);
const sun = new THREE.DirectionalLight('#ffc98a', 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 0.5; sc.far = 80;
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);

// per-room light: sun direction (toward the sun), its colour, fill, night flag
const LIGHT = {
  bath:    { sun: [0.45, 0.22, 1.0], col: '#ffc68a', I: 2.3, hemi: 0.8 },
  kitchen: { sun: [-0.35, 0.2, -1.0], col: '#ffc283', I: 2.4, hemi: 0.8 },
  hall:    { sun: [0.3, 0.6, -1.0], col: '#ffd3a0', I: 0.6, hemi: 1.0 },
  living:  { sun: [0.5, 0.18, -1.0], col: '#ffbe7d', I: 2.4, hemi: 0.75 },
  hallway: { sun: [1.0, 0.25, 0.5], col: '#ffc283', I: 1.4, hemi: 0.95 },
  dining:  { sun: [-0.45, 0.2, -1.0], col: '#ffb877', I: 2.3, hemi: 0.75 },
  stairs:  { sun: [-0.4, 0.25, 1.0], col: '#ffc283', I: 2.2, hemi: 0.85 },
  bed:     { sun: [0.5, 0.45, 1.0], col: '#8ea6ff', I: 0.5, hemi: 0.25, night: true },
  open:    { sun: [-1.0, 0.2, 0.25], col: '#ffbd7e', I: 2.4, hemi: 0.8 },
  pool:    { sun: [-0.22, 0.1, -1.0], col: '#ffb070', I: 2.6, hemi: 0.75 },
};

buildSets(scene);
buildCast(scene);
// the baked sky is bright: keep IBL as a soft fill except on deliberately shiny things
scene.traverse(o => {
  const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of ms) if (m.isMeshStandardMaterial && m.envMapIntensity === 1 && !m.userData.envDone) { m.envMapIntensity = m.metalness > 0.5 ? 0.7 : 0.32; m.userData.envDone = 1; }
});

const el = {
  title: document.getElementById('title'), counter: document.getElementById('counter'),
  len: document.getElementById('len'), sub: document.getElementById('sub'), day: document.getElementById('day'),
  stamp: document.getElementById('stamp'), caption: document.getElementById('caption'), fx: document.getElementById('fx'),
  end: document.getElementById('endcard'), start: document.getElementById('start'), bar: document.querySelector('#timebar i'),
  flash: document.getElementById('flash'),
};

// ---------- camera ----------
const _cp = new THREE.Vector3(), _cg = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function vecOf(set, v) {
  if (typeof v === 'function') return v();
  const o = SETS[set].origin; return new THREE.Vector3(o.x + v[0], o.y + v[1], o.z + v[2]);
}
function updateCamera(t) {
  const S = currentShot(t);
  const u = clamp((t - S.t0) / (S.t1 - S.t0), 0, 1);
  const e = S.ease === 'slow' ? easeInOut(clamp((t - S.t0) / 7.5, 0, 1)) : easeInOut(u) * 0.5 + u * 0.5;
  _cp.lerpVectors(vecOf(S.set, S.p0), vecOf(S.set, S.p1), e);
  _cg.lerpVectors(vecOf(S.set, S.g0), vecOf(S.set, S.g1), e);
  camera.position.copy(_cp); camera.lookAt(_cg);
  camera.fov = lerp(S.f0, S.f1, e);
  const hand = 0.006 * (S.hand ?? 1);
  _e.setFromQuaternion(camera.quaternion);
  _e.y += noise1(t * 0.35 + 3) * hand; _e.x += noise1(t * 0.3 + 9) * hand * 0.7; _e.z += noise1(t * 0.25 + 17) * hand * 0.5;
  // a little camera kick on each growth spurt
  const d = dayAt(t), gx = t - DAY_T(d) - GROW_AT[d];
  if (t >= COLD_OPEN && gx > 0 && gx < 0.6) { const k = Math.exp(-gx * 9) * 0.012; _e.x += Math.sin(gx * 60) * k; _e.z += Math.sin(gx * 47) * k * 0.6; }
  camera.quaternion.setFromEuler(_e);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return S;
}

// ---------- HUD ----------
const DIR = { cap: -1, capSpans: null };
function fmtLen(L) {
  if (L < 0.995) return { n: (L * 100).toFixed(L < 0.1 ? 1 : 0), u: 'cm' };
  return { n: L.toFixed(1), u: 'm' };
}
function updateHUD(t) {
  // title cold open
  el.title.style.opacity = t < COLD_OPEN ? 1 : 0;
  const tp = clamp(t / 0.35, 0, 1);
  el.title.style.transform = `scale(${(0.85 + 0.15 * (1 + 2.2 * Math.pow(tp - 1, 3) + 1.2 * Math.pow(tp - 1, 2))).toFixed(3)})`;
  // counter
  const on = t >= COLD_OPEN && t < END_T;
  el.counter.style.opacity = on ? 1 : 0;
  const d = dayAt(t), L = Math.min(noseLen(t), LEN(d)), f = fmtLen(L);
  el.len.innerHTML = `${f.n}<small>${f.u}</small>`;
  el.sub.textContent = `DAY ${d} OF 10 · +80% A DAY`;
  el.day.textContent = d;
  const gx = t - DAY_T(d) - GROW_AT[d];
  const pulse = gx > 0 && gx < 0.5 ? Math.exp(-gx * 7) : 0;
  el.len.style.transform = `scale(${(1 + pulse * 0.18).toFixed(3)})`;
  el.len.style.color = pulse > 0.05 ? `rgb(255,${Math.round(255 - 50 * pulse)},${Math.round(255 - 160 * pulse)})` : '';
  // DAY stamp at each cut
  const st = t - DAY_T(d);
  if (t >= COLD_OPEN && st >= 0 && st < 1.15) {
    el.stamp.style.opacity = (Math.min(1, st / 0.06) * (1 - smooth(0.85, 1.15, st))).toFixed(3);
    const a = clamp(st / 0.22, 0, 1), e = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
    el.stamp.style.transform = `translate(-50%,-50%) rotate(-4deg) scale(${(1.6 - 0.6 * e).toFixed(3)})`;
    el.stamp.textContent = `DAY ${d}`;
  } else el.stamp.style.opacity = 0;
  // captions: per-word pop as a pure function of film time
  const ci = CAPTIONS.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== DIR.cap) {
    DIR.cap = ci;
    if (ci < 0) el.caption.innerHTML = '';
    else {
      const words = CAPTIONS[ci][2].replace(/<em>(.*?)<\/em>/g, (m, a) => a.split(' ').map(w => '\u0001' + w).join(' ')).split(' ');
      el.caption.innerHTML = words.map(w => `<span class="${w[0] === '\u0001' ? 'em' : ''}">${w.replace('\u0001', '')}</span>`).join(' ');
    }
    DIR.capSpans = el.caption.querySelectorAll('span');
  }
  if (ci >= 0 && DIR.capSpans) {
    const t0 = CAPTIONS[ci][0] + 0.12, t1 = CAPTIONS[ci][1];
    const out = 1 - smooth(t1 - 0.22, t1, t);
    DIR.capSpans.forEach((sp, k) => {
      const a = clamp((t - t0 - k * 0.07) / 0.28, 0, 1);
      const e = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      sp.style.opacity = (Math.min(1, a * 1.6) * out).toFixed(3);
      sp.style.transform = `translateY(${((1 - a) * 1.5).toFixed(3)}cqw) scale(${(0.7 + 0.3 * e).toFixed(3)})`;
    });
  }
  // FX words, projected from 3D
  let html = '';
  const r = el.fx.getBoundingClientRect();
  for (const w of FXW) {
    const p = w.p.clone().project(camera);
    if (p.z > 1 || p.x < -1.2 || p.x > 1.2 || p.y < -1.2 || p.y > 1.2) continue;
    const x = clamp((p.x * 0.5 + 0.5) * 100, 14, 80), y = clamp((1 - (p.y * 0.5 + 0.5)) * 100, 28, 78);
    const a = clamp(w.age / 0.18, 0, 1), e = 1 + 2.4 * Math.pow(a - 1, 3) + 1.4 * Math.pow(a - 1, 2);
    const op = Math.min(1, a * 2) * (1 - smooth(0.75, 1, w.a));
    const rot = ((w.text.length * 7) % 13) - 6;
    html += `<b class="w ${w.cls}" style="left:${x.toFixed(2)}%;top:${(y - w.a * 3).toFixed(2)}%;opacity:${op.toFixed(3)};transform:translate(-50%,-50%) rotate(${rot}deg) scale(${(0.4 + 0.6 * e).toFixed(3)})">${w.text}</b>`;
  }
  el.fx.innerHTML = html;
  // end card
  const ea = smooth(END_T, END_T + 0.6, t);
  el.end.style.opacity = ea.toFixed(3);
  el.end.querySelectorAll('.l').forEach((n, k) => {
    const a = clamp((t - END_T - 0.3 - k * 0.55) / 0.4, 0, 1);
    n.style.opacity = a.toFixed(3); n.style.transform = `translateY(${((1 - a) * 2).toFixed(2)}cqw)`;
  });
  // white flash on the hard cut out of the cold open
  el.flash.style.opacity = (t >= COLD_OPEN && t < COLD_OPEN + 0.25 ? 0.7 * (1 - (t - COLD_OPEN) / 0.25) : 0).toFixed(3);
  el.bar.style.width = (t / DURATION * 100).toFixed(2) + '%';
}

// ---------- frame ----------
const _sd = new THREE.Vector3();
let curSet = null;
function render(t) {
  storyUpdate(t);
  const S = updateCamera(t);
  if (Q.has('cam')) {
    const c = Q.get('cam').split(',').map(Number), l = (Q.get('look') || '0,1,0').split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]); camera.lookAt(l[0], l[1], l[2]);
    camera.fov = +(Q.get('fov') || 45); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  const setName = S.set, Lt = LIGHT[setName], O = SETS[setName].origin;
  if (setName !== curSet) {
    curSet = setName;
    for (const k in SETS) SETS[k].g.visible = (k === setName);
    scene.environment = Lt.night ? ENV_NIGHT : ENV_DAY;
    horizon.material.map = Lt.night ? nightHorizon : dayHorizon; horizon.material.needsUpdate = true;
    sky.material.uniforms.uNight.value = Lt.night ? 1 : 0;
    sun.color.set(Lt.col); sun.intensity = Lt.I * 0.75;
    hemi.intensity = Lt.hemi * 0.55; hemi.color.set(Lt.night ? '#6f86c8' : '#ffe6cc'); hemi.groundColor.set(Lt.night ? '#1a1a26' : '#6b5a4c');
    amb.intensity = Lt.night ? 0.08 : 0.12;
    renderer.toneMappingExposure = Lt.night ? 1.1 : 0.92;
  }
  _sd.set(Lt.sun[0], Lt.sun[1], Lt.sun[2]).normalize();
  sky.material.uniforms.uSun.value.copy(_sd);
  sun.target.position.set(O.x, 0, O.z);
  sun.position.copy(sun.target.position).addScaledVector(_sd, 40);
  sky.position.copy(camera.position);
  horizon.position.set(camera.position.x, O.y + horizon.userData.yOff, camera.position.z);
  updateHUD(t);
  renderer.render(scene, camera);
}

// ---------- sizing, grain ----------
function resize() {
  const r = document.getElementById('stage').getBoundingClientRect();
  const pr = Q.has('render') ? +(Q.get('pr') || 1) : Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
const grain = document.getElementById('grain'), gctx = grain.getContext('2d');
grain.width = 360; grain.height = 640;
const gimg = gctx.createImageData(360, 640);
function drawGrain(seed) {
  const r = mulberry32(seed | 0), d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() - 0.5) * 140; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
}

// ---------- modes ----------
let simT = START, playing = false, last = performance.now(), frameN = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) {
    simT += dt;
    if (simT >= DURATION) { simT = DURATION; playing = false; el.start.classList.remove('gone'); document.getElementById('playBtn').textContent = '↻  Replay'; }
  }
  render(simT);
  if ((frameN++ & 1) === 0) drawGrain(frameN);
  requestAnimationFrame(loop);
}
document.getElementById('playBtn').addEventListener('click', () => {
  if (simT >= DURATION) simT = 0;
  const au = document.getElementById('audio');
  if (au) { try { au.currentTime = simT; au.play(); } catch (e) {} }
  playing = true; el.start.classList.add('gone');
});
window.addEventListener('keydown', e => {
  const au = document.getElementById('audio');
  if (e.code === 'Space') { e.preventDefault(); playing = !playing; el.start.classList.toggle('gone', playing); if (au) playing ? au.play() : au.pause(); }
  if (e.code === 'ArrowRight') { simT = Math.min(DURATION - 0.1, simT + 5); if (au) au.currentTime = simT; }
  if (e.code === 'ArrowLeft') { simT = Math.max(0, simT - 5); if (au) au.currentTime = simT; }
  if (e.code === 'KeyR') { simT = 0; if (au) au.currentTime = 0; }
  if (e.code === 'KeyH') document.body.classList.toggle('hidehud');
});
if (Q.has('clean')) document.getElementById('timebar').style.display = 'none';
window.simStats = () => ({ t: simT, day: dayAt(simT), nose: +noseLen(simT).toFixed(3), set: curSet });

if (Q.has('render')) {
  const FPS = +(Q.get('fps') || 30);
  el.start.classList.add('gone');
  document.getElementById('timebar').style.display = 'none';
  window.exportInfo = { fps: FPS, frames: Math.round(DURATION * FPS), duration: DURATION };
  window.renderFrameAt = n => { simT = n / FPS; render(simT); drawGrain(n * 7 + 1); return simT; };
  render(0); drawGrain(1);
  document.title = 'RENDER_READY';
} else if (SHOT != null) {
  el.start.classList.add('gone');
  simT = SHOT; render(SHOT); drawGrain(Math.round(SHOT * 60));
  document.title = 'SHOT_READY';
} else {
  requestAnimationFrame(loop);
}
