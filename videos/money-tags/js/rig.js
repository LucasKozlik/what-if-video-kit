'use strict';
// =====================================================================
// RIG — procedural people (group hierarchy, no skinning) and THE NOSE.
//
// The nose is the "field" of this piece: one tube whose length is a pure
// function of film time. Props that touch it (cups, frames, napkins, kids)
// read its sampled centreline, so the thing you see and the thing they
// react to are the same object.
// =====================================================================

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();

function cap(r, len, color, seg = 10) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, seg), stdMat(color, { roughness: 0.8 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function ball(r, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg || 20, opts.seg2 || 14), stdMat(color, Object.assign({ roughness: 0.65 }, opts.mat || {})));
  m.castShadow = opts.shadow !== false; m.receiveShadow = true;
  return m;
}
function boxm(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = 'YXZ';
  if (parent) parent.add(g);
  return g;
}

const POSE_KEYS = ['hipY', 'hipX', 'torX', 'torY', 'torZ', 'neckX', 'headX', 'headY', 'headZ',
  'lShX', 'lShY', 'lShZ', 'lElX', 'rShX', 'rShY', 'rShZ', 'rElX',
  'lHipX', 'lHipZ', 'lKnX', 'rHipX', 'rHipZ', 'rKnX', 'lAnX', 'rAnX'];

class Person {
  // o: { name, h, headScale, skin, shirt, pants, shoes, hair, hairStyle, dress, kid }
  constructor(scene, o) {
    this.o = o;
    const s = this.s = o.h / 1.75;
    const hs = o.headScale || 1.2;
    const R = this.R = 0.118 * hs * (o.kid ? 1.0 : 1.0) * Math.pow(s, 0.45);
    this.legLen = 0.93 * s;
    this.seed = o.seed || 1;

    const root = this.root = grp(scene);
    const hips = this.hips = grp(root, 0, this.legLen, 0);
    const pelvis = cap(0.135 * s, 0.1 * s, o.pants);
    pelvis.scale.set(1.15, 1, 0.8); pelvis.position.y = 0.02 * s; hips.add(pelvis);

    // torso
    const torso = this.torso = grp(hips, 0, 0.05 * s, 0);
    const tm = cap(0.15 * s, 0.3 * s, o.shirt);
    tm.position.y = 0.27 * s; tm.scale.set(1.18, 1, 0.74); torso.add(tm);
    this.torsoMesh = tm;
    if (o.jacket) {           // shirt front + tie for the suit
      const shirtV = new THREE.Mesh(new THREE.CircleGeometry(0.075 * s, 3), stdMat('#f4f1ea'));
      shirtV.rotation.z = -Math.PI / 2; shirtV.position.set(0, 0.42 * s, 0.112 * s); shirtV.scale.set(1.25, 0.8, 1);
      torso.add(shirtV);
      const tie = boxm(0.028 * s, 0.2 * s, 0.01, o.tie || '#7a1f2b');
      tie.position.set(0, 0.36 * s, 0.116 * s); tie.rotation.x = -0.12; torso.add(tie);
    }
    if (o.dress) {
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.3 * s, o.kid ? 0.32 * s : 0.62 * s, 18, 1, true),
        stdMat(o.dress, { side: THREE.DoubleSide, roughness: 0.7 }));
      sk.castShadow = true;
      sk.position.y = o.kid ? -0.12 * s : -0.27 * s; hips.add(sk); this.skirt = sk;
    }
    // neck + head
    const neck = this.neck = grp(torso, 0, 0.5 * s, 0);
    const nm = cap(0.045 * s, 0.06 * s, o.skin); nm.position.y = 0.04 * s; neck.add(nm);
    const head = this.head = grp(neck, 0, 0.09 * s, 0);
    const hm = ball(R, o.skin, { seg: 28, seg2: 20 });
    hm.position.y = R * 0.92; hm.scale.set(0.94, 1.04, 0.98); head.add(hm);
    const face = this.face = grp(head, 0, R * 0.92, 0);
    this.buildFace(face, R, o);

    // arms
    const mkArm = (side) => {
      const sh = grp(torso, side * 0.2 * s, 0.45 * s, 0);
      const up = cap(0.05 * s, 0.22 * s, o.sleeve || o.shirt); up.position.y = -0.14 * s; sh.add(up);
      const el = grp(sh, 0, -0.29 * s, 0);
      const fo = cap(0.042 * s, 0.2 * s, o.forearm || o.sleeve || o.shirt); fo.position.y = -0.13 * s; el.add(fo);
      const hand = ball(0.052 * s, o.skin); hand.position.y = -0.29 * s; hand.scale.set(0.8, 1.1, 0.6); el.add(hand);
      const handPt = grp(el, 0, -0.3 * s, 0);
      return { sh, el, handPt };
    };
    const L = mkArm(1), Rr = mkArm(-1);
    this.lSh = L.sh; this.lEl = L.el; this.lHand = L.handPt;
    this.rSh = Rr.sh; this.rEl = Rr.el; this.rHand = Rr.handPt;
    // legs
    const mkLeg = (side) => {
      const hp = grp(hips, side * 0.09 * s, 0, 0);
      const th = cap(0.07 * s, 0.32 * s, o.legs || o.pants); th.position.y = -0.22 * s; hp.add(th);
      const kn = grp(hp, 0, -0.45 * s, 0);
      const sh = cap(0.055 * s, 0.32 * s, o.shin || o.legs || o.pants); sh.position.y = -0.21 * s; kn.add(sh);
      const an = grp(kn, 0, -0.43 * s, 0);
      const ft = boxm(0.09 * s, 0.07 * s, 0.24 * s, o.shoes); ft.position.set(0, -0.015 * s, 0.06 * s); an.add(ft);
      return { hp, kn, an };
    };
    const lL = mkLeg(1), rL = mkLeg(-1);
    this.lHip = lL.hp; this.lKn = lL.kn; this.lAn = lL.an;
    this.rHip = rL.hp; this.rKn = rL.kn; this.rAn = rL.an;

    this.P = {}; POSE_KEYS.forEach(k => this.P[k] = 0);
    this.F = { smile: 0.4, open: 0, browL: 0, browR: 0, browTilt: 0, squint: 0, lookX: 0, lookY: 0, blink: 1 };
  }

  buildFace(face, R, o) {
    const eyeW = stdMat('#fbfbf8', { roughness: 0.3 });
    const pupM = stdMat('#1d1612', { roughness: 0.2 });
    this.eyes = []; this.pupils = []; this.brows = [];
    for (const sd of [1, -1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 16, 12), eyeW);
      e.position.set(sd * R * 0.34, R * 0.1, R * 0.84); e.scale.set(1, 1.15, 0.6); face.add(e); this.eyes.push(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(R * 0.095, 12, 10), pupM);
      p.position.set(sd * R * 0.34, R * 0.1, R * 0.93); p.scale.set(1, 1.1, 0.5); face.add(p); this.pupils.push(p);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(R * 0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(R * 0.03, R * 0.04, R * 0.04); p.add(hl);
      const b = boxm(R * 0.3, R * 0.06, R * 0.06, o.brow || o.hair);
      b.castShadow = false;
      b.position.set(sd * R * 0.35, R * 0.38, R * 0.86); face.add(b); this.brows.push(b);
    }
    // mouth: a smile arc (torus half) plus an open ellipse
    const lip = stdMat(o.lip || '#8a3b33', { roughness: 0.5 });
    const sm = new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, R * 0.032, 6, 16, Math.PI), lip);
    sm.rotation.z = Math.PI; const smG = grp(face, 0, -R * 0.36, R * 0.9); smG.add(sm);
    smG.rotation.x = -0.25;
    this.smileG = smG;
    const om = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 16, 12), stdMat('#4a1414', { roughness: 0.6 }));
    om.position.set(0, -R * 0.42, R * 0.86); face.add(om); this.openM = om;
    const teeth = boxm(R * 0.22, R * 0.06, R * 0.05, '#ffffff'); teeth.castShadow = false;
    teeth.position.set(0, R * 0.16, R * 0.08); om.add(teeth);
    // ears
    for (const sd of [1, -1]) {
      const ear = ball(R * 0.17, o.skin); ear.scale.set(0.45, 1, 0.7); ear.position.set(sd * R * 0.93, 0.02 * R, 0); face.add(ear);
    }
    if (!o.longNose) {
      const n = ball(R * 0.11, o.skin); n.position.set(0, -R * 0.1, R * 0.98); n.scale.set(1, 0.9, 1.25); face.add(n);
    }
    if (o.blush) {
      for (const sd of [1, -1]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#f08a8a', transparent: true, opacity: 0.45, roughness: 1 }));
        c.position.set(sd * R * 0.52, -R * 0.15, R * 0.78); c.scale.set(1, 0.6, 0.3); face.add(c);
      }
    }
    // hair
    const hairM = stdMat(o.hair, { roughness: 0.75 });
    const capG = new THREE.SphereGeometry(R * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI * (o.hairStyle === 'long' ? 0.52 : 0.44));
    const hc = new THREE.Mesh(capG, hairM); hc.castShadow = true;
    hc.rotation.x = -0.38; hc.position.set(0, R * 0.08, -R * 0.06); face.add(hc);
    if (o.hairStyle === 'long') {
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.8, R * 1.0, 4, 14), hairM);
      back.position.set(0, -R * 0.55, -R * 0.42); back.scale.set(1.12, 1, 0.55); back.castShadow = true; face.add(back);
    }
    if (o.hairStyle === 'pigtails') {
      for (const sd of [1, -1]) {
        const pt = ball(R * 0.3, o.hair); pt.position.set(sd * R * 1.05, -R * 0.1, -R * 0.3); pt.scale.set(0.8, 1.3, 0.8); face.add(pt);
        const tie = ball(R * 0.1, '#ff5d8f'); tie.position.set(sd * R * 0.96, R * 0.25, -R * 0.25); face.add(tie);
      }
    }
    if (o.hairStyle === 'tousled') {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const tuft = ball(R * 0.28, o.hair); tuft.position.set(Math.cos(a) * R * 0.5, R * 0.85, Math.sin(a) * R * 0.4 - R * 0.1);
        tuft.scale.set(1, 0.6, 1); face.add(tuft);
      }
    }
    if (o.hairStyle === 'bun') {
      const bun = ball(R * 0.42, o.hair); bun.position.set(0, R * 0.75, -R * 0.55); face.add(bun);
    }
    if (o.hood) {   // hoodie hood bunched behind the head
      const hd = new THREE.Mesh(new THREE.TorusGeometry(R * 0.85, R * 0.28, 8, 20), stdMat(o.hood, { roughness: 0.9 }));
      hd.position.set(0, -R * 0.75, -R * 0.35); hd.rotation.x = Math.PI / 2 + 0.5; hd.scale.set(1, 1.1, 0.8); hd.castShadow = true; face.add(hd);
    }
    if (o.glasses) {
      const gm = stdMat(o.glasses === 'sun' ? '#111' : '#6a4a2a', { roughness: 0.3, metalness: 0.4 });
      for (const sd of [1, -1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.2, R * 0.03, 6, 18), gm); rim.position.set(sd * R * 0.34, R * 0.1, R * 0.98); face.add(rim);
        if (o.glasses === 'sun') { const l = new THREE.Mesh(new THREE.CircleGeometry(R * 0.2, 16), stdMat('#151515', { roughness: 0.1, metalness: 0.6 })); l.position.set(sd * R * 0.34, R * 0.1, R * 0.99); face.add(l); }
      }
      const br = boxm(R * 0.25, R * 0.03, R * 0.03, '#222'); br.position.set(0, R * 0.12, R * 1.0); face.add(br);
    }
    if (o.headphones) {
      const hb = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, R * 0.06, 6, 20, Math.PI), stdMat('#202020')); hb.position.set(0, R * 0.05, 0); face.add(hb);
      for (const sd of [1, -1]) { const cup = ball(R * 0.22, '#e34f3a'); cup.scale.set(0.6, 1, 1); cup.position.set(sd * R * 1.0, 0, 0); face.add(cup); }
    }
    if (o.hairStyle === 'short') {
      const top = ball(R * 0.75, o.hair); top.position.set(0, R * 0.62, -R * 0.12); top.scale.set(1.25, 0.55, 1.2); face.add(top);
    }
  }

  place(x, y, z, heading) {
    this.root.position.set(x, y, z); this.root.rotation.y = heading || 0;
  }
  // write pose P (angles) + face F
  apply(t) {
    const P = this.P, s = this.s;
    this.hips.position.y = this.legLen + P.hipY;
    this.hips.rotation.x = P.hipX;
    this.torso.rotation.set(P.torX, P.torY, P.torZ);
    this.neck.rotation.x = P.neckX;
    this.head.rotation.set(P.headX, P.headY, P.headZ);
    this.lSh.rotation.set(P.lShX, P.lShY, P.lShZ); this.lEl.rotation.x = P.lElX;
    this.rSh.rotation.set(P.rShX, P.rShY, P.rShZ); this.rEl.rotation.x = P.rElX;
    this.lHip.rotation.set(P.lHipX, 0, P.lHipZ); this.lKn.rotation.x = P.lKnX; this.lAn.rotation.x = P.lAnX;
    this.rHip.rotation.set(P.rHipX, 0, P.rHipZ); this.rKn.rotation.x = P.rKnX; this.rAn.rotation.x = P.rAnX;
    if (this.skirt) { const sp = Math.max(Math.abs(P.lHipX), Math.abs(P.rHipX)); this.skirt.rotation.x = clamp(-(P.lHipX + P.rHipX) * 0.35, -0.5, 0.6); this.skirt.scale.set(1 + sp * 0.25, 1, 1 + sp * 0.5); }

    const F = this.F, R = this.R;
    // auto blink: pure function of time, offset per person
    const bp = (t * 0.31 + this.seed * 0.37) % 1;
    const blink = bp < 0.035 ? Math.sin(bp / 0.035 * Math.PI) : 0;
    const ey = Math.max(0.08, (1 - F.squint * 0.7) * (1 - blink * 0.92));
    this.eyes.forEach((e, i) => { e.scale.y = 1.15 * ey; });
    this.pupils.forEach((p, i) => {
      const sd = i === 0 ? 1 : -1;
      p.position.x = sd * R * 0.34 + F.lookX * R * 0.07 - sd * (this.cross || 0) * R * 0.075; p.position.y = R * 0.1 + F.lookY * R * 0.06;
      p.scale.y = 1.1 * Math.max(0.05, ey);
      p.visible = ey > 0.15;
    });
    this.brows[0].position.y = R * (0.38 + 0.12 * F.browL); this.brows[1].position.y = R * (0.38 + 0.12 * F.browR);
    this.brows[0].rotation.z = -F.browTilt * 0.35; this.brows[1].rotation.z = F.browTilt * 0.35;
    const sm = F.smile;
    this.smileG.scale.set(1 + Math.abs(sm) * 0.1, Math.abs(sm) < 0.06 ? 0.06 : sm, 1);
    this.openM.visible = F.open > 0.04;
    this.openM.scale.set(0.9 + F.open * 0.25, Math.max(0.05, F.open) * 0.9, 0.45);
  }

  // neutral standing with breathing; call first then override
  stand(t, amt = 1) {
    const P = this.P; POSE_KEYS.forEach(k => P[k] = 0);
    const br = Math.sin(t * 1.6 + this.seed) * 0.5 + 0.5;
    P.torX = -0.02 + br * 0.015 * amt; P.headX = 0.02 - br * 0.01;
    P.lShZ = 0.08; P.rShZ = -0.08; P.lElX = -0.12; P.rElX = -0.12;
    P.lShX = 0.03 * Math.sin(t * 0.8 + this.seed); P.rShX = -P.lShX;
    P.torZ = Math.sin(t * 0.5 + this.seed * 2) * 0.012;
    const F = this.F; F.smile = 0.35; F.open = 0; F.browL = F.browR = 0; F.browTilt = 0; F.squint = 0; F.lookX = 0; F.lookY = 0;
    return P;
  }
  walk(phase, amp = 1) {
    const P = this.P;
    const hipA = 0.42 * amp;
    P.lHipX = -hipA * Math.sin(phase); P.rHipX = hipA * Math.sin(phase);
    P.lKnX = (0.08 + 0.6 * Math.pow(Math.max(0, Math.cos(phase)), 1.5)) * amp;
    P.rKnX = (0.08 + 0.6 * Math.pow(Math.max(0, -Math.cos(phase)), 1.5)) * amp;
    P.lAnX = 0.22 * Math.sin(phase) * amp; P.rAnX = -0.22 * Math.sin(phase) * amp;
    P.lShX = 0.35 * Math.sin(phase) * amp; P.rShX = -0.35 * Math.sin(phase) * amp;
    P.torY = 0.1 * Math.sin(phase) * amp;
    P.hipY = -Math.abs(Math.cos(phase)) * 0.05 * this.s * amp;
    return P;
  }
  sit(seatH) {      // seated on a surface at height seatH (root at floor)
    const P = this.P;
    P.hipY = seatH - this.legLen + 0.06 * this.s;
    P.lHipX = P.rHipX = -1.5; P.lKnX = P.rKnX = 1.45; P.lAnX = P.rAnX = 0.05;
    P.lHipZ = 0.06; P.rHipZ = -0.06;
    return P;
  }
  laugh(t, k = 1) {
    const P = this.P, F = this.F;
    const b = Math.abs(Math.sin(t * 13 + this.seed)) * k;
    P.torX += (0.25 + b * 0.12) * k; P.headX += (-0.35 + b * 0.1) * k;
    P.hipY -= b * 0.03 * this.s;
    P.lShX += -0.35 * k; P.rShX += -0.35 * k; P.lElX += -1.2 * k; P.rElX += -1.2 * k; P.lShZ += -0.05; P.rShZ += 0.05;
    F.smile = 1; F.open = 0.55 + b * 0.35; F.squint = 0.85 * k; F.browL = F.browR = 0.5;
  }
  handWorld(side, out) { return (side > 0 ? this.lHand : this.rHand).getWorldPosition(out); }
}

// ---------------------------------------------------------------------
// THE NOSE
// ---------------------------------------------------------------------
const NS = 110, NR = 16;
class Nose {
  constructor(scene, person, skin) {
    this.person = person;
    const geo = new THREE.BufferGeometry();
    const nv = (NS + 1) * (NR + 1);
    this.pos = new Float32Array(nv * 3);
    const col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const c0 = new THREE.Color(skin), c1 = new THREE.Color(skin).lerp(new THREE.Color('#e0676b'), 0.28);
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) {
      const k = i * (NR + 1) + j, u = i / NS;
      const c = c0.clone().lerp(c1, smooth(0.6, 1.0, u));
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      uv[k * 2] = j / NR; uv[k * 2 + 1] = u;
    }
    const idx = [];
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
      const a = i * (NR + 1) + j, b = a + NR + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    const nm = stdMat('#3a1a16', { roughness: 0.9 });
    this.nostrils = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), nm); scene.add(m); return m; });
    // sampled centreline (world space) for props
    this.P = Array.from({ length: NS + 1 }, () => new THREE.Vector3());
    this.D = Array.from({ length: NS + 1 }, () => new THREE.Vector3());
    this.S = Array.from({ length: NS + 1 }, () => new THREE.Vector3());   // side
    this.N = Array.from({ length: NS + 1 }, () => new THREE.Vector3());   // "up" normal
    this.Rad = new Float32Array(NS + 1);
    this.L = 0.05;
  }
  baseRadius(L) { return 0.017 * Math.pow(L / 0.05, 0.31); }

  // opts: { L, kappa (rad/m droop), phiMax, yawK (rad/m), floor(x,z)->y, wob, wobT, pts (explicit world points) }
  update(t, o) {
    const L = this.L = o.L, head = this.person.head, R = this.person.R;
    const r0 = this.baseRadius(L);
    head.updateWorldMatrix(true, false);
    const root = _v1.set(0, R * 0.92 - R * 0.2, R * 0.84).applyMatrix4(head.matrixWorld);
    const F = _v2.set(0, -Math.sin(0.1), Math.cos(0.1)).transformDirection(head.matrixWorld);
    const side0 = _v3.set(1, 0, 0).transformDirection(head.matrixWorld);
    const ds = L / NS;
    const P = this.P, D = this.D;
    if (o.pts) {
      // explicit path: Catmull-Rom through given world points, resampled by arc length
      const curve = new THREE.CatmullRomCurve3([root.clone(), ...o.pts], false, 'centripetal');
      curve.arcLengthDivisions = 400;
      const fr = o.ptsFrac ?? 1;
      for (let i = 0; i <= NS; i++) curve.getPointAt(i / NS * fr, P[i]);
      this.L = curve.getLength() * fr;
    } else {
      let phi = Math.asin(clamp(-F.y, -1, 1)), yaw = Math.atan2(F.x, F.z);
      const kap = o.kappa || 0, phiMax = o.phiMax ?? 1.3, yk = o.yawK || 0;
      P[0].copy(root);
      for (let i = 1; i <= NS; i++) {
        const s = i * ds;
        phi = Math.min(phiMax, phi + kap * ds); yaw += yk * ds;
        const c = Math.cos(phi);
        P[i].set(P[i - 1].x + ds * c * Math.sin(yaw), P[i - 1].y - ds * Math.sin(phi), P[i - 1].z + ds * c * Math.cos(yaw));
        if (o.floor) {
          const fy = o.floor(P[i].x, P[i].z, s / L);
          const rr = r0 * 0.9;
          if (P[i].y < fy + rr) { P[i].y = fy + rr; phi = Math.min(phi, 0.0); }
        }
      }
    }
    // wobble: springy bob that grows toward the tip
    if (o.wob) for (let i = 1; i <= NS; i++) {
      const u = i / NS;
      P[i].y += o.wob * u * u * Math.sin((o.wobT ?? t) * 7.5 - u * 2.0);
    }
    // directions + parallel-transported frame
    for (let i = 0; i <= NS; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(NS, i + 1)];
      D[i].subVectors(b, a).normalize();
    }
    const S = this.S, N = this.N;
    S[0].copy(side0).addScaledVector(D[0], -side0.dot(D[0])).normalize();
    for (let i = 1; i <= NS; i++) {
      S[i].copy(S[i - 1]).addScaledVector(D[i], -S[i - 1].dot(D[i])).normalize();
    }
    for (let i = 0; i <= NS; i++) N[i].crossVectors(D[i], S[i]).normalize();   // points "up" (away from mouth)
    // radius profile
    const capLen = Math.min(L * 0.45, r0 * 1.15);
    for (let i = 0; i <= NS; i++) {
      const s = i * ds, u = i / NS;
      let r = r0 * (1 - 0.28 * u);
      // never wider than a real nose where it meets the face, so the eyes stay visible
      const rFace = Math.min(r0 * 1.5, 0.042);
      if (r0 > 0.028) r = lerp(rFace, r, smooth(0, Math.min(0.45, L * 0.2), s));
      else r *= 1 + 0.75 * Math.pow(Math.max(0, 1 - s / Math.min(L * 0.5, 0.05)), 2);   // flare into the face
      const tipD = (L - s) / (r0 * 1.6);
      r *= 1 + 0.32 * Math.exp(-Math.pow(tipD - 0.9, 2) * 1.5);                 // bulb
      const rem = L - s;
      if (rem < capLen) r *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - rem / capLen, 2)));
      this.Rad[i] = Math.max(r, 0.0005);
    }
    // vertices
    const pos = this.pos;
    for (let i = 0; i <= NS; i++) {
      const r = this.Rad[i];
      for (let j = 0; j <= NR; j++) {
        const a = j / NR * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const k = (i * (NR + 1) + j) * 3;
        const wx = ca * r, wy = sa * r * 0.9;
        pos[k] = P[i].x + S[i].x * wx + N[i].x * wy;
        pos[k + 1] = P[i].y + S[i].y * wx + N[i].y * wy;
        pos[k + 2] = P[i].z + S[i].z * wx + N[i].z * wy;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    // nostrils, under the tip
    const it = Math.max(0, NS - Math.round(NS * Math.min(0.5, (r0 * 1.0) / L)));
    for (let k = 0; k < 2; k++) {
      const sd = k ? 1 : -1, n = this.nostrils[k], rr = this.Rad[it];
      n.position.copy(P[it]).addScaledVector(N[it], -rr * 0.78).addScaledVector(S[it], sd * rr * 0.42);
      n.scale.set(rr * 0.22, rr * 0.16, rr * 0.3);
      n.quaternion.setFromUnitVectors(_v1.set(0, 0, 1), D[it]);
    }
  }
  // sample at arc fraction u in [0,1]
  at(u, out) { const f = clamp(u, 0, 1) * NS, i = Math.floor(Math.min(f, NS - 1)); return out.lerpVectors(this.P[i], this.P[i + 1], f - i); }
  dirAt(u, out) { return out.copy(this.D[Math.round(clamp(u, 0, 1) * NS)]); }
  upAt(u, out) { return out.copy(this.N[Math.round(clamp(u, 0, 1) * NS)]); }
  sideAt(u, out) { return out.copy(this.S[Math.round(clamp(u, 0, 1) * NS)]); }
  radAt(u) { return this.Rad[Math.round(clamp(u, 0, 1) * NS)]; }
  tip(out) { return out.copy(this.P[NS]); }
  // arc fraction at a given distance from the face
  uAt(s) { return clamp(s / this.L, 0, 1); }
}

// ---------------------------------------------------------------------
// A dog: same idea as the biped, four legs with paired phase, a wagging tail.
// ---------------------------------------------------------------------
class Dog {
  constructor(scene, color = '#d9a35a') {
    const root = this.root = grp(scene);
    const body = this.body = grp(root, 0, 0.42, 0);
    const b = cap(0.15, 0.42, color); b.rotation.x = Math.PI / 2; body.add(b);
    const chest = ball(0.16, color); chest.position.set(0, 0.03, 0.2); body.add(chest);
    const head = this.head = grp(body, 0, 0.17, 0.33);
    const hm = ball(0.13, color); head.add(hm);
    const snout = ball(0.075, '#e8c08a'); snout.scale.set(1, 0.8, 1.3); snout.position.set(0, -0.03, 0.12); head.add(snout);
    const nose = ball(0.03, '#1a1210'); nose.position.set(0, -0.005, 0.215); head.add(nose);
    for (const sd of [1, -1]) {
      const e = ball(0.024, '#1a1210'); e.position.set(sd * 0.055, 0.04, 0.105); head.add(e);
      const ear = ball(0.07, '#9c6a33'); ear.scale.set(0.5, 1.2, 0.8); ear.position.set(sd * 0.11, 0.02, -0.01); ear.rotation.z = sd * 0.3; head.add(ear);
    }
    const tongue = this.tongue = boxm(0.035, 0.006, 0.06, '#e8657a'); tongue.position.set(0, -0.075, 0.17); tongue.rotation.x = 0.6; head.add(tongue);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 18), stdMat('#d63b3b')); collar.position.set(0, 0.1, 0.26); collar.rotation.x = 1.2; body.add(collar);
    this.tail = grp(body, 0, 0.06, -0.3);
    const tl = cap(0.03, 0.2, color); tl.position.y = 0.12; this.tail.add(tl); this.tail.rotation.x = -0.6;
    this.legs = [];
    for (const [x, z] of [[0.09, 0.2], [-0.09, 0.2], [0.09, -0.2], [-0.09, -0.2]]) {
      const hip = grp(body, x, -0.05, z); const lg = cap(0.04, 0.26, color); lg.position.y = -0.17; hip.add(lg);
      const paw = ball(0.045, '#f0e0c0'); paw.position.y = -0.33; hip.add(paw); this.legs.push(hip);
    }
  }
  place(x, y, z, h) { this.root.position.set(x, y, z); this.root.rotation.y = h; this.root.visible = true; }
  pose(t, o = {}) {
    const wag = o.wag ?? 1, sit = o.sit ?? 0, ph = o.phase ?? 0, amp = o.walk ?? 0;
    this.tail.rotation.z = Math.sin(t * 18) * 0.7 * wag; this.tail.rotation.x = -0.6 - 0.3 * wag;
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 * amp; });
    // sitting: back legs fold, body tilts up
    this.body.rotation.x = -0.45 * sit; this.body.position.y = 0.42 - 0.08 * sit;
    this.legs[2].rotation.x += -1.2 * sit; this.legs[3].rotation.x += -1.2 * sit;
    this.legs[0].rotation.x += 0.45 * sit; this.legs[1].rotation.x += 0.45 * sit;
    this.head.rotation.x = 0.45 * sit + (o.bark ? -0.25 * Math.max(0, Math.sin(t * 25)) : 0) + Math.sin(t * 3) * 0.05;
    this.head.rotation.z = Math.sin(t * 2.2) * 0.12 * (o.tilt ?? 1);
    this.tongue.visible = o.tongue !== false;
  }
}
