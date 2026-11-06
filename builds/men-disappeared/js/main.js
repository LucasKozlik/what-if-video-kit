'use strict';
// =====================================================================
// MAIN — renderer, frame loop, seeking, shot + export modes.
// The whole scene is a pure function of film time, so seeking is free.
//   ?shot=12.5   render one frame at 12.5 s, title -> SHOT_READY
//   ?render=1&fps=30   export mode: window.renderFrameAt(n)
//   ?cam=x,y,z&look=x,y,z&fov=50   debug camera
// =====================================================================
const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot') ? parseFloat(Q.get('shot')) : null;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xcfe2ee);
scene.fog = new THREE.FogExp2(0xc2d6e2, 0.0011);
const camera = new THREE.PerspectiveCamera(55, 9 / 16, 0.05, 6000);

// Sun high and slightly behind the camera (camera looks +z, sun sits at -z).
const SUN_DIR = new THREE.Vector3(-0.35, 0.82, -0.45).normalize();
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN_DIR }, uFog: { value: FOG } },
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position);
    vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uFog; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float el = d.y;
      vec3 zen = vec3(0.24, 0.52, 0.86), hor = vec3(0.70, 0.84, 0.94);
      vec3 c = mix(hor, zen, pow(smoothstep(0.0, 0.65, el), 0.8));
      float s = max(dot(d, normalize(uSun)), 0.0);
      c += vec3(1.0, 0.92, 0.75) * (pow(s, 8.0) * 0.18 + pow(s, 900.0) * 2.0);
      // a few soft fair-weather clouds
      vec2 q = d.xz / max(el, 0.06) * 1.6;
      float n = sin(q.x*1.3+sin(q.y*0.7)*2.0)*sin(q.y*1.1+q.x*0.3) * 0.5 + 0.5;
      float cl = smoothstep(0.72, 0.95, n) * smoothstep(0.03, 0.25, el) * (1.0 - smoothstep(0.5, 0.8, el));
      c = mix(c, vec3(0.97, 0.97, 0.96), cl * 0.75);
      c = mix(c, uFog, 1.0 - smoothstep(-0.02, 0.06, el));
      gl_FragColor = vec4(c, 1.0); }`,
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xc9a978, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 1.45);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 260;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);

buildWorld(scene);
buildPeople(scene);
buildYou(scene);
WORLD.water.material.uniforms.uSun.value.copy(SUN_DIR);
WORLD.water.material.uniforms.uFog.value.copy(FOG);

const el = {
  hook: document.getElementById('hook'), counter: document.getElementById('counter'),
  men: document.getElementById('men'), sub: document.getElementById('menSub'),
  caption: document.getElementById('caption'), end: document.getElementById('endcard'),
  endItems: [...document.querySelectorAll('#endcard .it')],
  start: document.getElementById('start'), bar: document.querySelector('#timebar i'),
};

function resize() {
  const r = document.getElementById('stage').getBoundingClientRect();
  const pr = Q.has('render') ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
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

function render(T) {
  const t = storyTime(T);
  updateCamera(T, camera);
  if (Q.has('cam')) {
    const c = Q.get('cam').split(',').map(Number), l = (Q.get('look') || '0,0,10').split(',').map(Number);
    camera.position.set(c[0], c[1], c[2]); camera.lookAt(l[0], l[1], l[2]);
    camera.fov = +(Q.get('fov') || 50); camera.updateProjectionMatrix();
    camera.userData.target = new THREE.Vector3(l[0], 0, l[2]);
  }
  // shadow box follows what the camera is looking at
  const tg = camera.userData.target || new THREE.Vector3();
  const fx = (camera.position.x + tg.x) / 2, fz = (camera.position.z + tg.z) / 2;
  sun.target.position.set(fx, 0, fz);
  sun.position.set(fx + SUN_DIR.x * 120, SUN_DIR.y * 120, fz + SUN_DIR.z * 120);
  sky.position.copy(camera.position);
  WORLD.water.material.uniforms.uT.value = t;

  poseAll(t);
  poseYou(t);
  PEOPLE.you.root.visible = true;
  PEOPLE.you.head.visible = !DIR.pov; PEOPLE.you.torso.children[0].visible = !DIR.pov;
  writeProps(t);
  writeDust(t);
  updateHUD(T, el);
  renderer.render(scene, camera);
  el.bar.style.width = (T / DURATION * 100).toFixed(2) + '%';
}

window.simStats = () => ({ people: PEOPLE.list.length, info: renderer.info.render });

let playing = false, T = 0, last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) { T += dt; if (T >= DURATION) { T = DURATION; playing = false; el.start.classList.remove('gone'); } }
  render(T); drawGrain(now);
  requestAnimationFrame(loop);
}
document.getElementById('playBtn').addEventListener('click', () => {
  if (T >= DURATION) T = 0; playing = true; el.start.classList.add('gone');
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); playing = !playing; el.start.classList.toggle('gone', playing); }
  if (e.code === 'KeyR') T = 0;
  if (e.code === 'ArrowRight') T = Math.min(DURATION, T + 2);
  if (e.code === 'ArrowLeft') T = Math.max(0, T - 2);
  if (e.code === 'KeyH') document.body.classList.toggle('hidehud');
});

if (Q.has('render')) {
  const FPS = +(Q.get('fps') || 30);
  el.start.classList.add('gone');
  document.getElementById('timebar').style.display = 'none';
  window.exportInfo = { fps: FPS, frames: Math.round(DURATION * FPS), duration: DURATION };
  window.renderFrameAt = n => { render(n / FPS); drawGrain(n * 7 + 1); return n / FPS; };
  render(0); drawGrain(1);
  document.title = 'RENDER_READY';
} else if (SHOT != null) {
  el.start.classList.add('gone');
  document.getElementById('timebar').style.display = 'none';
  render(SHOT); drawGrain(3);
  document.title = 'SHOT_READY';
} else {
  T = parseFloat(Q.get('t') || '0');
  requestAnimationFrame(loop);
}
