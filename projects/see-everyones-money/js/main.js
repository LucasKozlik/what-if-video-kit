'use strict';
// =====================================================================
// MAIN — renderer, fixed-step deterministic loop, seeking, shot mode.
//   ?shot=41   render one frame at 41 s, then set title to SHOT_READY
//   ?t=30      start playback at 30 s
//   ?cam=x,y,z&look=x,y,z&fov=50   override the camera for inspection
//   ?render=1  offline export mode (tools/export.mjs)
//   ?pr=1.25   force the canvas pixel ratio (export speed vs. sharpness)
// =====================================================================

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot') ? parseFloat(Q.get('shot')) : null;
const START = parseFloat(Q.get('t') || '0');
const DURATION = 61;
const DT = 1 / 60;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance',
  preserveDrawingBuffer: SHOT != null || Q.has('render'),
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xb9c6d2);
scene.fog = new THREE.FogExp2(FOG, 0.0065);
const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.15, 3000);

// Morning sun: low in the east (+x), a little south, so the avenue rakes with long shadows.
const SUN_DIR = new THREE.Vector3(0.62, 0.42, -0.66).normalize();
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN_DIR }, uFog: { value: FOG } },
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position);
    vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun, uFog; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float el = d.y;
      vec3 hi = vec3(0.30,0.52,0.82), lo = vec3(0.80,0.84,0.88);
      vec3 c = mix(lo, hi, pow(smoothstep(0.0, 0.6, el), 0.7));
      float s = max(dot(d, uSun), 0.0);
      c += vec3(1.0,0.82,0.55) * (pow(s, 8.0) * 0.35 + pow(s, 300.0) * 3.0);
      c = mix(c, uFog, 1.0 - smoothstep(0.0, 0.12, el));
      gl_FragColor = vec4(min(c, vec3(4.0)), 1.0); }`,
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

const hemi = new THREE.HemisphereLight(0xbcd2ea, 0x6a5e50, 0.85); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2bd, 2.3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 10; sc.far = 400;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);

buildWorld(scene);
buildPeople(scene);
buildLabels();
updateField(0);

const $ = id => document.getElementById(id);
const el = {
  hook: $('hook'), hookLines: [...document.querySelectorAll('#hook span')],
  counters: $('counters'), caption: $('caption'),
  cPeople: $('cPeople'), cMed: $('cMed'), cAvg: $('cAvg'), boxMed: $('boxMed'), boxAvg: $('boxAvg'),
  end: $('endcard'), endKids: [...document.querySelectorAll('#endcard > *')],
  start: $('start'), bar: document.querySelector('#timebar i'),
};

const EVENTS = [];
let simT = 0, acc = 0, playing = false;
function stepSim() { simT += DT; }
function fastForward(T) { while (simT < T - 1e-6) { stepSim(); EVENTS.length = 0; } }

function resize() {
  const r = $('stage').getBoundingClientRect();
  const pr = Q.has('pr') ? +Q.get('pr')
    : Math.min(Math.max(window.devicePixelRatio || 1, 1.75), 2160 / Math.max(1, r.height), 2.5);
  renderer.setPixelRatio(pr);
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
}
window.addEventListener('resize', resize); resize();

const grain = $('grain'), gctx = grain.getContext('2d');
grain.width = 360; grain.height = 640;
const gimg = gctx.createImageData(360, 640);
function drawGrain() {
  const d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 150; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
}

function render() {
  const t = simT;
  updateField(t);
  updateCamera(t, camera);
  if (Q.has('cam')) {
    const c = Q.get('cam').split(',').map(Number), l = (Q.get('look') || '0,2,0').split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]); camera.lookAt(l[0], l[1], l[2]);
    camera.fov = +(Q.get('fov') || 50); camera.updateProjectionMatrix();
    camera.userData.target = new THREE.Vector3(l[0], 0, l[2]);
  }
  // shadow box follows what the camera is looking at
  const tg = camera.userData.target || new THREE.Vector3();
  const sx = Math.round(tg.x / 4) * 4, sz = Math.round(tg.z / 4) * 4;
  sun.target.position.set(sx, 0, sz);
  sun.position.set(sx + SUN_DIR.x * 200, SUN_DIR.y * 200, sz + SUN_DIR.z * 200);
  sky.position.copy(camera.position);

  writeWorld(t);
  personAt(DIR.focus || HER, FIELD.st);
  writePeople(t);
  writeLabels(t, camera);
  updateHUD(t, el);
  EVENTS.length = 0;
  renderer.render(scene, camera);
  el.bar.style.width = (t / DURATION * 100).toFixed(2) + '%';
}

let last = performance.now(), frameN = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) {
    acc += dt; let n = 0;
    while (acc >= DT && n < 4) { stepSim(); acc -= DT; n++; }
    if (n === 4) acc = 0;
    if (simT >= DURATION) { playing = false; el.start.classList.remove('gone'); $('playBtn').textContent = '↻  Replay'; }
  }
  render();
  if ((frameN++ & 1) === 0) drawGrain();
  requestAnimationFrame(loop);
}
function restartAt(t, autoplay) {
  const q = new URLSearchParams(location.search);
  q.set('t', t.toFixed(2)); autoplay ? q.set('play', '1') : q.delete('play');
  location.search = q.toString();
}
$('playBtn').addEventListener('click', () => {
  if (simT >= DURATION) { restartAt(0, true); return; }
  playing = true; el.start.classList.add('gone');
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); playing = !playing; el.start.classList.toggle('gone', playing); }
  if (e.code === 'KeyR') restartAt(0, true);
  if (e.code === 'ArrowRight') fastForward(Math.min(DURATION - 0.1, simT + 5));
  if (e.code === 'ArrowLeft') restartAt(Math.max(0, simT - 5), playing);
  if (e.code === 'KeyH') document.body.classList.toggle('hidehud');
});
if (Q.has('clean')) $('timebar').style.display = 'none';

window.simStats = () => ({ st: +FIELD.st.toFixed(2), revealed: FIELD.revealed,
  median: Math.round(FIELD.median), mean: Math.round(FIELD.mean), shot: DIR.shot,
  labelsOn: LBL.els.filter(l => l.on).length });

// Fonts must be loaded before the first captured frame, or frame 0 uses the fallback face.
document.fonts.ready.then(() => {
  if (Q.has('render')) {
    const FPS = +(Q.get('fps') || 60);
    el.start.classList.add('gone'); $('timebar').style.display = 'none';
    window.exportInfo = { fps: FPS, frames: Math.round(DURATION * FPS), duration: DURATION };
    window.renderFrameAt = n => { simT = n / FPS; render(); drawGrain(); return simT; };
    render(); drawGrain();
    document.title = 'RENDER_READY';
  } else if (SHOT != null) {
    el.start.classList.add('gone');
    simT = SHOT; render(); drawGrain();
    document.title = 'SHOT_READY';
  } else {
    if (START > 0) simT = START;
    if (Q.has('play')) { playing = true; el.start.classList.add('gone'); }
    requestAnimationFrame(loop);
  }
});
