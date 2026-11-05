'use strict';
// =====================================================================
// MAIN — renderer, linear HDR pipeline with one tone map in post,
// fixed-step deterministic loop, seeking, shot mode, offline export.
//   ?shot=41   render one frame at 41 s, then set title to SHOT_READY
//   ?t=30      start playback at 30 s
//   ?cam=x,y,z&look=x,y,z&fov=50   override the camera for inspection
// =====================================================================

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot') ? parseFloat(Q.get('shot')) : null;
const START = parseFloat(Q.get('t') || '0');
const DURATION = 61;
const DT = 1 / 60;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.LinearEncoding;   // post writes display values itself
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const FOG = new THREE.Color();
scene.fog = new THREE.FogExp2(FOG, 0.0042);
const camera = new THREE.PerspectiveCamera(46, 9 / 16, 0.03, 4000);

// ---- sky: linear radiance, clamped so the sun can never overflow the half-float target ----
const SUN_DIR = new THREE.Vector3(-0.78, 0.36, -0.52).normalize();
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN_DIR }, uHaze: U.haze, uTime: U.time, uFog: { value: FOG } },
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position);
    vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: GLSL_NOISE + `uniform vec3 uSun; uniform float uHaze; uniform float uTime; uniform vec3 uFog; varying vec3 vD;
    void main(){
      vec3 d = normalize(vD); float el = d.y;
      vec3 zen = mix(vec3(0.10, 0.25, 0.62), vec3(0.42, 0.44, 0.46), uHaze);
      vec3 hor = mix(vec3(0.62, 0.70, 0.78), vec3(0.62, 0.60, 0.56), uHaze);
      vec3 c = mix(hor, zen, pow(smoothstep(-0.02, 0.6, el), 0.7));
      float sd = max(dot(d, uSun), 0.0);
      vec3 sunCol = mix(vec3(1.0, 0.78, 0.5), vec3(0.95, 0.9, 0.8), uHaze);
      c += sunCol * (pow(sd, 8.0) * 0.55 + pow(sd, 64.0) * 1.2) * (1.0 - uHaze * 0.5);
      c += sunCol * smoothstep(0.9993, 0.9997, sd) * 30.0;
      // fair-weather cumulus on a plane above
      if (el > 0.0) {
        vec2 uv = d.xz / (el + 0.08) * 1.6 + vec2(uTime * 0.004, 0.0);
        float n = fbm3(vec3(uv, 1.3)) * 0.5 + 0.5;
        float cl = smoothstep(0.55 - uHaze * 0.2, 0.8, n) * smoothstep(0.0, 0.15, el);
        vec3 cc = mix(vec3(1.05, 1.0, 0.95), vec3(0.75, 0.74, 0.72), uHaze) * (0.7 + 0.5 * pow(sd, 3.0));
        c = mix(c, cc, cl * (0.85 - uHaze * 0.35));
      }
      c = mix(c, uFog, 1.0 - smoothstep(-0.01, 0.12, el));
      gl_FragColor = vec4(min(c, vec3(40.0)), 1.0);
    }`,
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

const hemi = new THREE.HemisphereLight(0x9fb8d8, 0x4b4a30, 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);

buildWorld(scene);
buildLife(scene);
updateField(0);

// ---- post: tone map, grade, vignette ----
const RT = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: RT.texture }, uSat: { value: 1 }, uWarm: { value: 1 }, uExp: { value: 1 }, uFade: { value: 0 } },
  depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tSrc; uniform float uSat, uWarm, uExp, uFade; varying vec2 vUv;
    vec3 aces(vec3 v){ v = v / 0.6; return clamp((v*(v+0.0245786)-0.000090537)/(v*(0.983729*v+0.4329510)+0.238081), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * uExp;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = max(mix(vec3(l), c, uSat), 0.0);
      float w = (uWarm - 0.75) * 0.24;
      c *= vec3(1.0 + w, 1.0, 1.0 - w * 1.2);
      c = srgb(aces(c));
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q * vec2(1.1, 0.8), q * vec2(1.1, 0.8)) * 0.9;
      c = max(c, vec3(0.055)) ;                         // black floor: never a hole in the frame
      c = mix(c, vec3(0.0), uFade);
      gl_FragColor = vec4(c, 1.0);
    }`,
}));
post.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(post);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const el = {
  hook: document.getElementById('hook'), counters: document.getElementById('counters'),
  caption: document.getElementById('caption'), end: document.getElementById('endcard'),
  day: document.getElementById('cDay'), dayLbl: document.getElementById('cDayLbl'),
  ins: document.getElementById('cIns'), insBox: document.getElementById('insBox'),
  birds: document.getElementById('cBirds'), flw: document.getElementById('cFlw'),
  start: document.getElementById('start'), bar: document.querySelector('#timebar i'),
};

let simT = 0, acc = 0, playing = false;
function stepSim() { updateField(simT); stepWorld(DT, simT); simT += DT; }
function fastForward(T) { while (simT < T - 1e-6) stepSim(); }

let PR = 1;
function resize() {
  const r = document.getElementById('stage').getBoundingClientRect();
  PR = Q.has('render') ? +(Q.get('pr') || 1) : Math.min(Math.max(window.devicePixelRatio || 1, 1.25), 2160 / Math.max(1, r.height), 2);
  renderer.setPixelRatio(PR);
  renderer.setSize(r.width, r.height, false);
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  RT.setSize(s.x, s.y);
  camera.aspect = r.width / r.height;
}
window.addEventListener('resize', resize); resize();

const grain = document.getElementById('grain'), gctx = grain.getContext('2d');
grain.width = 360; grain.height = 640;
const gimg = gctx.createImageData(360, 640);
const GR = mulberry32(99);
function drawGrain() {
  const d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (GR() - 0.5) * 140; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gctx.putImageData(gimg, 0, 0);
}

function render() {
  updateField(simT);
  updateCamera(simT, camera);
  if (Q.has('cam')) {
    const c = Q.get('cam').split(',').map(Number), l = (Q.get('look') || '0,1,0').split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]); camera.lookAt(l[0], l[1], l[2]);
    camera.fov = +(Q.get('fov') || 46); camera.updateProjectionMatrix();
    camera.userData.target = new THREE.Vector3(l[0], 0, l[2]);
  }
  // shadow box: tight around what the camera looks at, wider on wide shots
  const tgt = camera.userData.target || new THREE.Vector3();
  const reach = clamp(camera.position.distanceTo(tgt) * 1.3, 8, 90);
  const sc = sun.shadow.camera;
  sc.left = -reach; sc.right = reach; sc.top = reach; sc.bottom = -reach; sc.near = 1; sc.far = reach * 6;
  sc.updateProjectionMatrix();
  sun.target.position.copy(tgt);
  sun.position.copy(tgt).addScaledVector(SUN_DIR, reach * 3);

  // the light itself flattens as the world loses colour
  U.haze.value = ECO.haze;
  FOG.setRGB(lerp(0.6, 0.6, ECO.haze), lerp(0.68, 0.59, ECO.haze), lerp(0.76, 0.55, ECO.haze));
  scene.fog.density = lerp(0.0022, 0.0042, ECO.haze) * (1 - smooth(10, 50, camera.position.y) * 0.55);
  sun.intensity = lerp(2.5, 1.5, ECO.haze);
  sun.color.setRGB(1.0, lerp(0.86, 0.9, ECO.haze), lerp(0.68, 0.82, ECO.haze));
  hemi.intensity = lerp(1.15, 1.3, ECO.haze);
  sky.position.copy(camera.position);

  writeWorld(simT);
  writeLife(simT);
  updateHUD(simT, el);

  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  PU.uScale.value = s.y / (2 * Math.tan(camera.fov * Math.PI / 360));
  post.material.uniforms.uSat.value = ECO.sat;
  post.material.uniforms.uWarm.value = ECO.warm;
  post.material.uniforms.uExp.value = 1.0;
  post.material.uniforms.uFade.value = smooth(60.2, 61, simT) * 0.0;
  renderer.setRenderTarget(RT); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  el.bar.style.width = (simT / DURATION * 100).toFixed(2) + '%';
}

let last = performance.now(), frameN = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) {
    acc += dt; let n = 0;
    while (acc >= DT && n < 4) { stepSim(); acc -= DT; n++; }
    if (n === 4) acc = 0;
    if (simT >= DURATION) { playing = false; el.start.classList.remove('gone'); document.getElementById('playBtn').textContent = '↻  Replay'; }
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
document.getElementById('playBtn').addEventListener('click', () => {
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
if (Q.has('clean')) document.getElementById('timebar').style.display = 'none';

window.simStats = () => Object.assign({ t: +simT.toFixed(2), day: Math.floor(ECO.day), litter: WORLD.litterN, shot: DIR.shot }, lifeStats());

if (Q.has('render')) {
  const FPS = +(Q.get('fps') || 60);
  el.start.classList.add('gone');
  document.getElementById('timebar').style.display = 'none';
  window.exportInfo = { fps: FPS, frames: Math.round(DURATION * FPS), duration: DURATION };
  window.renderFrameAt = n => {
    const target = n / FPS;
    while (simT < target - 1e-6) stepSim();
    render(); drawGrain();
    return simT;
  };
  render(); drawGrain();
  document.title = 'RENDER_READY';
} else if (SHOT != null) {
  el.start.classList.add('gone');
  fastForward(SHOT);
  render(); drawGrain();
  document.title = 'SHOT_READY';
} else {
  if (START > 0) fastForward(START);
  if (Q.has('play')) { playing = true; el.start.classList.add('gone'); }
  requestAnimationFrame(loop);
}
