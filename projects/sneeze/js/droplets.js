'use strict';
// =====================================================================
// DROPLETS — every sneeze emits a turbulent puff. Each particle stores its
// origin (the mouth at the moment of the CHOO), the direction the head was
// pointing, its emission time and four random numbers. The vertex shader
// computes the whole motion from cloudReach(), the same function the HUD's
// tape measure reads in JS, so what you see is what the counter says.
// =====================================================================

const DROPS = {};

function buildDroplets(scene) {
  const O = [], D = [], T = [], RR = [], G = [], K = [];
  const R = mulberry32(4040), _m = new THREE.Vector3(), _f = new THREE.Vector3();
  const emit = (mouth, dir, tc, n, ground, size = 1) => {
    for (let k = 0; k < n; k++) {
      O.push(mouth.x, mouth.y, mouth.z); D.push(dir.x, dir.y, dir.z); T.push(tc); G.push(ground); K.push(size);
      RR.push(R(), R(), R(), R());
    }
  };
  // heroes: the CHOO direction is where the head points just after the jerk
  for (const p of PEOPLE.cast) {
    if (p.tc > 900 || p.hold || p.role === 'lie') continue;
    const tc = p.tc, s = tc + 0.08;
    mouthPos(p, s, s, _m);
    const fwd = new THREE.Vector3(0, 0, 1).transformDirection(_H);
    fwd.y = Math.min(fwd.y, -0.05); fwd.normalize();
    const ground = setOrigin(p).y + (p.set ? 0 : 0.15);
    emit(_m, fwd, tc, p.mask ? 500 : p.elbow ? 400 : p.i === 0 ? 9000 : 4000, ground, p.i === 0 ? 2.4 : 1.6);
  }
  // the stadium: a few droplets per face, enough to make a glittering mist
  for (const c of PEOPLE.crowd) {
    const s = CHOO + c.tj + 0.08, sp = sneezePhase(s - CHOO - c.tj);
    const yaw = c.yaw, pitch = 0.32 * sp.jerk - 0.05 * sp.inh;
    const hx = -0.45 * sp.inh + 0.6 * sp.jerk;
    _f.set(Math.sin(yaw) * Math.cos(pitch + hx), -Math.sin(pitch + hx) * 0.8 - 0.1, Math.cos(yaw) * Math.cos(pitch + hx)).normalize();
    _m.set(c.x + Math.sin(yaw) * 0.22, c.y + 1.2 * c.s, c.z + Math.cos(yaw) * 0.22);
    emit(_m, _f, CHOO + c.tj, 12, c.y - 0.4, 3.0);
  }
  for (const c of PEOPLE.street) {
    _f.set(Math.sin(c.yaw), -0.25, Math.cos(c.yaw)).normalize();
    _m.set(c.x + Math.sin(c.yaw) * 0.2, c.y + 1.62 * c.s, c.z + Math.cos(c.yaw) * 0.2);
    emit(_m, _f, CHOO + c.tj, 260, c.y, 1.3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(O, 3));
  g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 3));
  g.setAttribute('aTc', new THREE.Float32BufferAttribute(T, 1));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(RR, 4));
  g.setAttribute('aG', new THREE.Float32BufferAttribute(G, 1));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 1));
  DROPS.mat = new THREE.ShaderMaterial({
    uniforms: { uS: { value: 0 }, uT: { value: 0 }, uScale: { value: 1000 }, uSun: { value: new THREE.Vector3() } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: CLOUD_GLSL + `
      attribute vec3 aD; attribute float aTc; attribute vec4 aR; attribute float aG; attribute float aK;
      uniform float uS, uT, uScale; uniform vec3 uSun;
      varying float vA; varying float vPuff; varying float vGlint;
      void main(){
        float tau = uS - aTc;
        if (tau <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
        float frac = pow(aR.x, 0.55);
        float X = cloudReach(tau) * frac;                         // along the jet
        vec3 up = abs(aD.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 s1 = normalize(cross(aD, up)), s2 = cross(s1, aD);
        float ang = aR.z * 6.2832, rad = (0.03 + X * 0.3) * sqrt(aR.y);
        vec3 p = position + aD * X + (s1 * cos(ang) + s2 * sin(ang)) * rad;
        // turbulence inside the puff
        p += vec3(sin(tau * 1.7 + aR.y * 40.0), sin(tau * 1.3 + aR.z * 37.0) * 0.6, cos(tau * 1.5 + aR.x * 31.0)) * 0.08 * min(tau, 2.0);
        // the biggest droplets fall out within a metre or two; the fine ones hang
        float big = smoothstep(0.82, 1.0, aR.w);
        p.y -= big * 4.9 * min(tau, 0.7) * min(tau, 0.7) + 0.02 * tau;
        p.y = max(p.y, aG + 0.01);
        vPuff = step(aR.w, 0.14);
        vA = smoothstep(0.0, 0.04, tau) * (1.0 - smoothstep(6.5, 9.5, tau)) * (1.0 - big * smoothstep(0.5, 0.8, tau) * 0.7);
        vGlint = 0.55 + 0.45 * sin(uT * 23.0 + aR.y * 300.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix((0.004 + 0.006 * aR.y + big * 0.006) * aK, 0.14 + 0.35 * min(X / 7.6, 1.0), vPuff);
        gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 90.0);
      }`,
    fragmentShader: `varying float vA; varying float vPuff; varying float vGlint;
      void main(){
        vec2 d = gl_PointCoord - 0.5; float r = dot(d, d);
        if (r > 0.25) discard;
        float fall = 1.0 - r * 4.0;
        vec3 drop = vec3(1.6, 1.75, 1.9) * vGlint;               // droplets catching the light
        vec3 puff = vec3(0.75, 0.8, 0.88);
        float a = mix(fall * 0.95, fall * fall * 0.16, vPuff) * vA;
        gl_FragColor = vec4(mix(drop, puff, vPuff) * a, a);
      }`,
  });
  DROPS.points = new THREE.Points(g, DROPS.mat); DROPS.points.frustumCulled = false;
  scene.add(DROPS.points);
  DROPS.n = T.length;
}

function writeDroplets(t, camera, renderer) {
  DROPS.mat.uniforms.uS.value = SN.s; DROPS.mat.uniforms.uT.value = t;
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  DROPS.mat.uniforms.uScale.value = s.y / (2 * Math.tan(camera.fov * Math.PI / 360));
}

// A tape measure on the pavement in front of Sam, for the side-on cloud shot.
function buildTape(scene) {
  const p = PEOPLE.cast[0], O = setOrigin(p);
  const tex = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.font = '800 34px Inter, sans-serif';
    for (let m = 0; m <= 8; m++) {
      const x = m / 8 * w; g.fillRect(x - 3, 0, 6, h * 0.6);
      for (let k = 1; k < 10 && m < 8; k++) g.fillRect(x + k * w / 80 - 1, 0, 2, h * (k === 5 ? 0.4 : 0.22));
      if (m > 0) g.fillText(m + ' m', x - 58, h - 8);
    }
  });
  const geo = new THREE.PlaneGeometry(8, 0.28); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0);
  // the strip runs along +x of its own frame; rotate so it runs along Sam's forward
  const g2 = geo.clone(); g2.rotateY(-Math.PI / 2); g2.translate(0, 0, 4);
  const tape = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  tape.position.set(O.x + p.x + 0.35, 0.165, O.z + p.z + 0.15); tape.rotation.y = p.face;
  tape.receiveShadow = true; tape.visible = false; scene.add(tape);
  WORLD.tape = tape;
}
