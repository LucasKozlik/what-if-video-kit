'use strict';
// =====================================================================
// PEOPLE — a jointed rig (groups + merged vertex-coloured segments), a
// flat pose dictionary, and per-person behaviour written as a PURE
// FUNCTION OF STORY TIME. No state: any instant can be rendered directly,
// which is what lets the cold open show the end of the story.
// Local frame: a person faces +z, their left is +x.
// =====================================================================

const PEOPLE = { list: [], byName: {}, dust: null };
const YOU = new THREE.Vector3(0, 0, 0.3);

const JOINTS = ['hipH', 'lie', 'torX', 'torY', 'torZ', 'headX', 'headY',
  'lShX', 'lShZ', 'lElX', 'rShX', 'rShZ', 'rElX',
  'lHipX', 'lHipZ', 'lKnX', 'rHipX', 'rHipZ', 'rKnX', 'lAnX', 'rAnX'];

function basePose(kind, s) {
  const P = {}; JOINTS.forEach(j => P[j] = 0);
  P.hipH = 0.93 * s; P.lShZ = 0.09; P.rShZ = -0.09; P.lElX = -0.15; P.rElX = -0.15;
  switch (kind) {
    case 'sit':        // legs out, leaning back on the hands
      Object.assign(P, { hipH: 0.11 * s, lHipX: -1.5, rHipX: -1.5, lHipZ: 0.08, rHipZ: -0.08, lKnX: 0.15, rKnX: 0.2,
        torX: -0.28, lShX: 0.55, rShX: 0.55, lShZ: 0.2, rShZ: -0.2, lElX: 0, rElX: 0, lAnX: -0.2, rAnX: -0.2 }); break;
    case 'knees':      // knees up, forearms resting on them
      Object.assign(P, { hipH: 0.11 * s, lHipX: -2.1, rHipX: -2.1, lHipZ: 0.12, rHipZ: -0.12, lKnX: 1.75, rKnX: 1.75,
        torX: 0.1, lShX: -0.75, rShX: -0.75, lShZ: 0.1, rShZ: -0.1, lElX: -0.9, rElX: -0.9, lAnX: 0.35, rAnX: 0.35 }); break;
    case 'lie':
      Object.assign(P, { hipH: 0.115 * s, lie: 1, lShZ: 0.18, rShZ: -0.18, lElX: -0.1, rElX: -0.1, lHipZ: 0.05, rHipZ: -0.05,
        lAnX: -0.5, rAnX: -0.5, headX: -0.15 }); break;
    case 'kneel':
      Object.assign(P, { hipH: 0.52 * s, lHipX: -0.15, rHipX: -0.15, lKnX: 1.55, rKnX: 1.55, torX: 0.5, headX: 0.3,
        lShX: -0.95, rShX: -0.7, lElX: -0.3, rElX: -0.5, lAnX: 0.7, rAnX: 0.7 }); break;
    case 'volley':
      Object.assign(P, { hipH: 0.84 * s, lHipX: -0.45, rHipX: -0.45, lHipZ: 0.12, rHipZ: -0.12, lKnX: 0.75, rKnX: 0.75,
        lAnX: -0.3, rAnX: -0.3, torX: 0.35, headX: -0.25, lShX: -0.65, rShX: -0.65, lShZ: -0.12, rShZ: 0.12, lElX: -0.05, rElX: -0.05 }); break;
    case 'ride':
      Object.assign(P, { hipH: 0.0, lHipX: -1.3, rHipX: -1.3, lHipZ: 0.32, rHipZ: -0.32, lKnX: 1.5, rKnX: 1.5,
        torX: 0.25, lShX: -1.15, rShX: -1.15, lShZ: 0.25, rShZ: -0.25, lElX: -0.35, rElX: -0.35, lAnX: 0.3, rAnX: 0.3 }); break;
    case 'chair':      // sitting on a chair, binoculars up
      Object.assign(P, { hipH: 0.0, lHipX: -1.45, rHipX: -1.45, lKnX: 1.45, rKnX: 1.45, lHipZ: 0.1, rHipZ: -0.1,
        lShX: -1.35, rShX: -1.35, lShZ: -0.35, rShZ: 0.35, lElX: -1.75, rElX: -1.75, headX: 0.05 }); break;
    case 'surf':
      Object.assign(P, { hipH: 0.82 * s, lHipX: -0.35, rHipX: 0.3, lHipZ: 0.2, rHipZ: -0.2, lKnX: 0.7, rKnX: 0.6,
        torX: 0.25, torY: 0.5, headY: 0.9, lShZ: 1.15, rShZ: -1.0, lShX: -0.3, rShX: 0.3, lElX: -0.2, rElX: -0.25 }); break;
  }
  return P;
}

function gaitInto(P, phase, amp, s) {
  const hipA = 0.42 * amp, kn = 0.75;
  P.lHipX = -hipA * Math.sin(phase); P.rHipX = hipA * Math.sin(phase);
  P.lKnX = (0.08 + kn * Math.max(0, Math.cos(phase)) ** 1.5) * amp;
  P.rKnX = (0.08 + kn * Math.max(0, -Math.cos(phase)) ** 1.5) * amp;
  P.lAnX = 0.25 * Math.sin(phase) * amp; P.rAnX = -0.25 * Math.sin(phase) * amp;
  P.lShX = 0.38 * Math.sin(phase) * amp; P.rShX = -0.38 * Math.sin(phase) * amp;
  P.torY = 0.1 * Math.sin(phase) * amp;
  P.hipH = 0.93 * s - Math.abs(Math.cos(phase)) * 0.05 * s * amp;
}
function blendPose(A, B, w, out = {}) {
  for (const j of JOINTS) out[j] = A[j] + (B[j] - A[j]) * w;
  return out;
}
const _unused = 0;
const angLerp = (a, b, w) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * w; };

// ---------- the rig ----------
function capsule(r, L) { const g = new THREE.CapsuleGeometry(r, Math.max(0.001, L - 2 * r), 3, 8); g.translate(0, -L / 2, 0); return g; }
function ell(rx, ry, rz, y = 0, z = 0, x = 0) { const g = new THREE.SphereGeometry(1, 12, 8); g.scale(rx, ry, rz); g.translate(x, y, z); return g; }
const RIGMAT = () => stdMat(0xffffff, { vertexColors: true, roughness: 0.7 });

class Person {
  constructor(o) {
    Object.assign(this, o);
    const s = this.s = (o.ht || 1.72) / 1.75;
    const skin = new THREE.Color(o.skin), suit = new THREE.Color(o.suit), suit2 = new THREE.Color(o.suit2 ?? o.suit),
          hair = new THREE.Color(o.hair), dark = new THREE.Color(0x1a1412), lip = skin.clone().multiplyScalar(0.8);
    const male = o.sex === 'm', onePiece = !!o.onePiece;
    const seg = (parts) => { const m = new THREE.Mesh(mergeGeoms(parts), RIGMAT()); m.castShadow = true; return m; };
    const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

    this.root = new THREE.Group();
    this.body = G(this.root);
    // pelvis
    this.body.add(seg([{ geo: ell(0.165 * s, 0.11 * s, 0.11 * s, 0), color: male ? suit : suit2 }]));
    // torso
    this.torso = G(this.body);
    const tp = [
      { geo: new THREE.CylinderGeometry(0.135 * s, 0.15 * s, 0.24 * s, 10).translate(0, 0.13 * s, 0).scale(1, 1, 0.75),
        color: onePiece ? suit : skin },
      { geo: ell(male ? 0.19 * s : 0.165 * s, 0.17 * s, 0.115 * s, 0.37 * s), color: onePiece ? suit : skin },
      { geo: new THREE.CylinderGeometry(0.05 * s, 0.055 * s, 0.12 * s, 8).translate(0, 0.56 * s, 0), color: skin },
    ];
    if (!male && !onePiece)
      tp.push({ geo: new THREE.CylinderGeometry(0.168 * s, 0.168 * s, 0.085 * s, 12).scale(1, 1, 0.72).translate(0, 0.39 * s, 0.006 * s), color: suit });
    if (onePiece) tp.push({ geo: new THREE.CylinderGeometry(0.15 * s, 0.155 * s, 0.07 * s, 10).scale(1, 1, 0.76).translate(0, 0.02 * s, 0), color: suit });
    this.torso.add(seg(tp));
    // head
    this.neck = G(this.torso, 0, 0.6 * s, 0);
    const hp = [
      { geo: ell(0.095 * s, 0.118 * s, 0.105 * s, 0.11 * s), color: skin },
      { geo: ell(0.012 * s, 0.014 * s, 0.01 * s, 0.13 * s, 0.096 * s, 0.035 * s), color: dark },
      { geo: ell(0.012 * s, 0.014 * s, 0.01 * s, 0.13 * s, 0.096 * s, -0.035 * s), color: dark },
      { geo: ell(0.016 * s, 0.026 * s, 0.02 * s, 0.1 * s, 0.103 * s), color: skin.clone().multiplyScalar(0.93) },
      { geo: ell(0.03 * s, 0.008 * s, 0.01 * s, 0.055 * s, 0.095 * s), color: lip },
      { geo: ell(0.1 * s, 0.09 * s, 0.108 * s, 0.155 * s, -0.012 * s), color: hair },
    ];
    if (!male) {
      hp.push({ geo: ell(0.098 * s, 0.15 * s, 0.06 * s, 0.06 * s, -0.07 * s), color: hair });
      if (o.bun) hp.push({ geo: ell(0.05 * s, 0.05 * s, 0.05 * s, 0.22 * s, -0.08 * s), color: hair });
    }
    if (o.cap) hp.push({ geo: ell(0.104 * s, 0.06 * s, 0.112 * s, 0.19 * s, 0), color: new THREE.Color(o.cap) },
                        { geo: new THREE.BoxGeometry(0.13 * s, 0.012 * s, 0.09 * s).translate(0, 0.165 * s, 0.11 * s), color: new THREE.Color(o.cap) });
    if (o.shades) hp.push({ geo: new THREE.BoxGeometry(0.15 * s, 0.03 * s, 0.02 * s).translate(0, 0.13 * s, 0.1 * s), color: dark });
    this.head = G(this.neck); this.head.add(seg(hp));
    // arms
    const arm = (side) => {
      const sh = G(this.torso, side * (male ? 0.2 : 0.175) * s, 0.47 * s, 0);
      sh.add(seg([{ geo: capsule((male ? 0.048 : 0.042) * s, 0.3 * s), color: skin }]));
      const el = G(sh, 0, -0.29 * s, 0);
      const hseg = [{ geo: capsule((male ? 0.042 : 0.036) * s, 0.25 * s), color: skin },
                    { geo: new THREE.BoxGeometry(0.075 * s, 0.09 * s, 0.03 * s).translate(0, -0.285 * s, 0), color: skin }];
      if (o.fingers) {
        for (let f = 0; f < 4; f++) hseg.push({ geo: capsule(0.009 * s, 0.075 * s).translate((f - 1.5) * 0.019 * s, -0.325 * s, 0), color: skin });
        hseg.push({ geo: capsule(0.011 * s, 0.06 * s).rotateZ(side * 0.7).translate(side * 0.04 * s, -0.26 * s, 0.006 * s), color: skin });
      } else hseg.push({ geo: ell(0.034 * s, 0.035 * s, 0.017 * s, -0.33 * s), color: skin });
      el.add(seg(hseg));
      const hand = G(el, 0, -0.3 * s, 0);
      return { sh, el, hand };
    };
    this.lA = arm(1); this.rA = arm(-1);
    // legs
    const leg = (side) => {
      const hip = G(this.body, side * 0.09 * s, -0.02 * s, 0);
      const tparts = [{ geo: capsule((male ? 0.074 : 0.072) * s, 0.45 * s), color: skin }];
      if (male) tparts.push({ geo: new THREE.CylinderGeometry(0.098 * s, 0.09 * s, 0.36 * s, 10).translate(0, -0.15 * s, 0), color: suit });
      else tparts.push({ geo: ell(0.078 * s, 0.05 * s, 0.075 * s, -0.01 * s), color: suit2 });
      hip.add(seg(tparts));
      const kn = G(hip, 0, -0.44 * s, 0);
      kn.add(seg([{ geo: capsule(0.052 * s, 0.44 * s), color: skin },
                  { geo: ell(0.048 * s, 0.034 * s, 0.125 * s, -0.445 * s, 0.065 * s), color: skin }]));
      return { hip, kn };
    };
    this.lL = leg(1); this.rL = leg(-1);
    this.meshes = []; this.root.traverse(m => m.isMesh && this.meshes.push(m));
    this.P = basePose('stand', s);
  }

  apply(P, x, y, z, heading) {
    const s = this.s;
    this.root.position.set(x, y, z); this.root.rotation.y = heading;
    this.body.position.y = P.hipH; this.body.rotation.x = -P.lie * Math.PI / 2;
    this.torso.rotation.set(P.torX, P.torY, P.torZ, 'YXZ');
    this.neck.rotation.set(P.headX, P.headY, 0, 'YXZ');
    this.lA.sh.rotation.set(P.lShX, 0, P.lShZ); this.lA.el.rotation.x = P.lElX;
    this.rA.sh.rotation.set(P.rShX, 0, P.rShZ); this.rA.el.rotation.x = P.rElX;
    this.lL.hip.rotation.set(P.lHipX, 0, P.lHipZ); this.lL.kn.rotation.x = P.lKnX;
    this.rL.hip.rotation.set(P.rHipX, 0, P.rHipZ); this.rL.kn.rotation.x = P.rKnX;
  }
  handWorld(out, side, tAt) {
    if (tAt !== undefined && this.snap) return out.copy(this.snap[side]);
    this.root.updateMatrixWorld(true);
    return (side === 'l' ? this.lA.hand : this.rA.hand).getWorldPosition(out);
  }
  headingAt(t) { return this.behave(t).h; }
}

// ---------- behaviour ----------
// Every person = an action (what they were doing) + a reaction schedule (women) or a
// vanish time (men). Women: the action time-warps to a stop when they notice, so a
// walker decelerates naturally and her feet stop with her; then they get up, look
// around, and finally turn to face YOU.
function warp(t, t0, k = 3) { return t < t0 ? t : t0 + (1 - Math.exp(-(t - t0) * k)) / k; }

function actionPose(p, ta) {
  const s = p.s, A = p.act;
  let x = p.x, y = p.y || 0, z = p.z, h = p.h;
  let P;
  switch (A) {
    case 'walk': case 'carry': {
      const d = p.v * ta; x += Math.sin(h) * d; z += Math.cos(h) * d;
      P = basePose('stand', s);
      gaitInto(P, d / (1.45 * s) * Math.PI * 2 + p.seed, 1, s);
      if (A === 'carry') Object.assign(P, { lShX: -0.35, rShX: -0.35, lShZ: -0.12, rShZ: 0.12, lElX: -1.1, rElX: -1.1, torX: -0.06 });
      break;
    }
    case 'volley': {
      P = basePose('volley', s);
      const bounce = Math.sin(ta * 4 + p.seed);
      P.hipH += 0.02 * s * bounce;
      if (p.spike) {  // the man is winding up for the set coming his way
        const w = smooth(T_EVENT - 0.6, T_EVENT - 0.05, ta);
        P.lShX = lerp(P.lShX, -2.6, w); P.rShX = lerp(P.rShX, -1.6, w); P.lElX = lerp(P.lElX, -0.4, w);
        P.torX = lerp(P.torX, -0.1, w); P.lKnX = P.rKnX = lerp(0.75, 1.05, w); P.headX = lerp(P.headX, -0.6, w);
        P.hipH -= 0.06 * s * w;
      } else if (p.setter) {
        const w = smooth(T_EVENT - 0.75, T_EVENT - 0.35, ta) * (1 - smooth(T_EVENT - 0.15, T_EVENT + 0.3, ta));
        P.lShX = P.rShX = lerp(P.lShX, -2.7, w); P.lElX = P.rElX = lerp(-0.05, -0.9, w); P.headX = lerp(P.headX, -0.7, w);
        P.hipH += 0.08 * s * w; P.lKnX = P.rKnX = lerp(0.75, 0.2, w);
      }
      break;
    }
    case 'grill':
      P = basePose('stand', s);
      Object.assign(P, { rShX: -0.85 + 0.22 * Math.sin(ta * 3.4), rElX: -0.75, rShZ: 0.1, lShX: -0.4, lElX: -0.9, torX: 0.12, headX: 0.45 });
      break;
    case 'lie': P = basePose('lie', s); if (p.armsUp) Object.assign(P, { lShX: -2.9, rShX: -2.9, lElX: -2.2, rElX: -2.2, lShZ: 0.4, rShZ: -0.4 }); break;
    case 'sit': P = basePose('sit', s); P.headY = 0.25 * Math.sin(ta * 0.3 + p.seed); break;
    case 'knees': P = basePose('knees', s); if (p.phone) Object.assign(P, { headX: 0.55, lElX: -1.5, rElX: -1.5, lShX: -0.55, rShX: -0.55 }); break;
    case 'kneel': P = basePose('kneel', s); P.lShX += 0.25 * Math.sin(ta * 2.2 + p.seed); P.rShX += 0.2 * Math.sin(ta * 1.7 + p.seed); break;
    case 'stand': case 'wade':
      P = basePose('stand', s);
      if (p.chat) { P.lShX = -0.3 + 0.25 * Math.sin(ta * 1.3 + p.seed); P.lElX = -1.2; P.headY = 0.12 * Math.sin(ta * 0.7 + p.seed); }
      if (A === 'wade') Object.assign(P, { lShZ: 0.5 + 0.1 * Math.sin(ta + p.seed), rShZ: -0.5, lElX: -0.5, rElX: -0.5 });
      P.torZ = 0.03 * Math.sin(ta * 0.5 + p.seed);
      break;
    case 'frisbee': {
      P = basePose('stand', s);
      const per = 2.6, u = ((ta + p.seed) % per) / per;
      const thr = smooth(0.0, 0.12, u) * (1 - smooth(0.12, 0.3, u));
      Object.assign(P, { rShX: -0.5 - thr * 0.6, rShZ: -0.4 - thr * 1.1, rElX: -0.6 + thr * 0.5, torY: -0.4 * thr, lHipX: -0.2, rHipX: 0.15, lKnX: 0.2, rKnX: 0.15 });
      break;
    }
    case 'ride': {
      const J = jetskiState(ta);
      const c = Math.cos(J.yaw), sn = Math.sin(J.yaw);
      x = J.x + sn * -0.45; z = J.z + c * -0.45; y = J.y + 0.66; h = J.yaw;
      P = basePose('ride', s); P.torZ = J.roll; P.torX += J.pitch;
      break;
    }
    case 'chair': P = basePose('chair', s); P.headY = 0.3 * Math.sin(ta * 0.25); P.torY = P.headY * 0.4; break;
    case 'surf': {
      const B = boardState(ta);
      x = B.x; z = B.z; y = B.y + 0.04; h = B.yaw + Math.PI / 2;
      P = basePose('surf', s); P.torZ = 0.08 * Math.sin(ta * 1.4); P.lShZ += 0.15 * Math.sin(ta * 1.9);
      break;
    }
    default: P = basePose('stand', s);
  }
  return { P, x, y, z, h };
}

// What a woman does once she has noticed. Pure function of t.
function behave(p, t) {
  if (p.sex === 'm') return actionPose(p, t);
  const R = p.react;
  const ta = warp(t, R.notice, 2.5);
  const a = actionPose(p, ta);
  let { P, x, y, z, h } = a;
  // 1. notice: stop, look around
  const wN = smooth(R.notice, R.notice + 0.7, t);
  // 2. get up (sit up from lying, stand from sitting/kneeling/volley crouch)
  const upKind = R.up || 'stand';
  const wU = R.tUp != null ? smooth(R.tUp, R.tUp + 1.3, t) : 0;
  if (wU > 0) blendPose(P, basePose(upKind, p.s), wU, P);
  // relax active stances back to neutral when they notice
  if (['volley', 'grill', 'frisbee', 'stand', 'walk', 'carry', 'wade'].includes(p.act)) {
    const B = basePose('stand', p.s);
    if (p.act === 'wade') Object.assign(B, { lShZ: 0.35, rShZ: -0.35, lElX: -0.6, rElX: -0.6 });
    blendPose(P, B, wN * 0.85, P);
  }
  // 3. face you (body turns), then maybe step toward you
  const toYou = Math.atan2(YOU.x - x, YOU.z - z);
  const wF = R.face != null ? smooth(R.face, R.face + 1.5, t) : 0;
  h = angLerp(h, toYou, upKind === 'sit' ? wF * 0.75 : wF);
  if (R.walkIn && wF > 0 && upKind === 'stand') {
    // walk in and stop on a loose ring around you (radius per person), at ~1.3 m/s
    const dist0 = Math.hypot(YOU.x - x, YOU.z - z);
    const ring = 2.6 + hash1(p.seed * 17.3) * 4.2;
    const D = Math.max(0, dist0 - ring), dur = D / 2.3 + 0.7;
    const t0 = R.face + 0.3;
    const u = clamp((t - t0) / dur, 0, 1), us = (t - t0) / dur;
    const e = u * u * (3 - 2 * u) * 0.25 + u * 0.75;
    const d = D * e;
    const hh = toYou;
    x += Math.sin(hh) * d; z += Math.cos(hh) * d;
    const sp = us > 0 && us < 1 ? D / dur : 0;
    if (sp > 0.05) gaitInto(P, d / (1.45 * p.s) * Math.PI * 2, clamp(sp / 1.0, 0, 1) * smooth(0, 0.1, us) * (1 - smooth(0.9, 1, us)), p.s);
  }
  // head: look-around noise, or at a gaze target, or at you once facing
  let gy = 0, gx = P.headX;
  const look = 0.75 * noise1(t * 0.55 + p.seed * 3) + 0.25 * noise1(t * 1.7 + p.seed);
  gy = lerp(P.headY, look, wN * (1 - wF));
  let gazeT = null;
  if (R.gaze) for (const g of R.gaze) if (t >= g[0] && t < g[1]) gazeT = g[2];
  if (gazeT) {
    const dir = Math.atan2(gazeT.x - x, gazeT.z - z);
    let rel = angLerp(0, dir - h, 1); rel = clamp(rel, -1.25, 1.25);
    const gw = R.gazeW ? R.gazeW(t) : 1;
    gy = lerp(gy, rel, gw);
    gx = lerp(gx, 0, gw * 0.6);
  }
  if (wF > 0) {
    const rel = clamp(angLerp(0, toYou - h, 1), -1.2, 1.2);
    const dist = Math.hypot(YOU.x - x, YOU.z - z);
    gy = lerp(gy, rel, wF);
    const eye = (P.lie > 0.5 ? 0.3 : P.hipH + 0.75 * p.s) + y;
    gx = lerp(gx, Math.atan2(eye - 0.9, Math.max(1, dist)) * 0.9 - (P.torX || 0), wF);
  }
  if (R.recoil) {   // the one next to the vanished man: startle back, hand to mouth
    const w = smooth(R.recoil, R.recoil + 0.35, t) * (1 - smooth(R.recoil + 1.8, R.recoil + 2.6, t));
    P.torX = lerp(P.torX, -0.35, w); P.rShX = lerp(P.rShX, -2.0, w); P.rElX = lerp(P.rElX, -2.3, w); P.rShZ = lerp(P.rShZ, 0.15, w);
  }
  P.headY = gy; P.headX = gx;
  // breathing so nobody is a statue
  P.torX += 0.012 * Math.sin(t * 1.6 + p.seed);
  return { P, x, y, z, h };
}

// ---------- the cast ----------
const SKIN = [0xf1d0b5, 0xe3b48f, 0xc98e62, 0xa86b44, 0x8a5634, 0x6b3f26, 0x4e2c1c, 0xf5dcc7, 0xd6a17a];
const HAIR = [0x1d1612, 0x3a2416, 0x6b4426, 0xb8894e, 0xe2c27f, 0x2a1d17, 0x8d4a26, 0x111111];
const SUIT = [0xe8463c, 0x2f8fd8, 0xf2b630, 0x37b37e, 0xec6aa0, 0x7d5bd6, 0xff8a3d, 0x20b2aa, 0x1b1b1f, 0xffffff, 0xf26b8a];
const SHORTS = [0x2f8fd8, 0xe8463c, 0x37b37e, 0xf2b630, 0x1b2a4a, 0xff8a3d, 0x20b2aa, 0x6b6b70];

function cast() {
  const R = mulberry32(2024);
  const pick = a => a[Math.floor(R() * a.length)];
  const L = [];
  const W = (o) => L.push(Object.assign({ sex: 'f', ht: 1.6 + R() * 0.14, skin: pick(SKIN), hair: pick(HAIR),
    suit: pick(SUIT), onePiece: R() < 0.35, bun: R() < 0.3, seed: R() * 10 }, o));
  const M = (o) => L.push(Object.assign({ sex: 'm', ht: 1.72 + R() * 0.14, skin: pick(SKIN), hair: pick(HAIR),
    suit: pick(SHORTS), seed: R() * 10 }, o));
  const face0 = 24.8;                         // the overhead beat: everyone turns to you
  const F = () => face0 + R() * 1.6;
  const V3 = (x, z, y = 1.5) => new THREE.Vector3(x, y, z);

  // --- volleyball: two women on the far side (x=-9.4), a woman + a man on the near side
  W({ name: 'vbA1', act: 'volley', x: -9.4, z: 14.6, h: Math.PI / 2,
      react: { notice: 6.4, gaze: [[7.9, 9.4, V3(-9.4, 17.6)], [9.4, 10.6, V3(-2.6, 14.8)]], tUp: 6.8, face: F(), walkIn: 2.5 } });
  W({ name: 'vbA2', act: 'volley', x: -9.4, z: 17.6, h: Math.PI / 2,
      react: { notice: 6.3, gaze: [[8.0, 9.5, V3(-9.4, 14.6)], [9.5, 10.6, V3(-2.6, 14.8)]], tUp: 6.9, face: F(), walkIn: 2.2 } });
  W({ name: 'vbB', act: 'volley', setter: true, x: -2.6, z: 18.0, h: -Math.PI / 2,
      react: { notice: 6.15, gaze: [[6.3, 8.2, V3(-2.6, 14.8, 1.0)], [8.2, 9.6, V3(-9.4, 16)]], tUp: 6.6, face: F(), walkIn: 2.0 } });
  M({ name: 'vbM', act: 'volley', spike: true, x: -2.6, z: 14.8, h: -Math.PI / 2 });

  // --- the couple on the pink towel in front of you
  W({ name: 'couple', act: 'knees', phone: true, x: 1.15, z: 6.0, h: 0, onePiece: false, suit: 0xf2b630, hair: 0x3a2416,
      react: { notice: 10.9, recoil: 11.45, gaze: [[10.9, 13.2, V3(2.4, 6.0, 0.2)]], gazeW: t => smooth(10.9, 11.25, t),
               tUp: 18.5, face: F(), walkIn: 1 } });
  M({ name: 'coupleMan', act: 'lie', x: 2.45, z: 6.6, h: Math.PI, armsUp: true });

  // --- grill and the cooler
  M({ name: 'griller', act: 'grill', x: 3.5, z: 11.65, h: Math.PI, cap: 0xe8463c });
  M({ name: 'cooler', act: 'carry', x: -9.0, z: 8.2, h: Math.PI / 2, v: 1.3 });

  // --- sandcastle
  M({ name: 'castleM', act: 'kneel', x: -0.95, z: 21.3, h: -0.6 });
  W({ name: 'castleW', act: 'kneel', x: -2.2, z: 22.5, h: 2.3, react: { notice: 6.5, tUp: 9.0, face: F(), walkIn: 1.2 } });

  // --- water: jet ski, surfer, waders
  M({ name: 'jetski', act: 'ride', x: 0, z: 0, h: 0, shades: true });
  M({ name: 'surfer', act: 'surf', x: 0, z: 0, h: 0 });
  W({ name: 'wade1', act: 'wade', x: -6.5, z: 33.5, y: -0.55, h: Math.PI, react: { notice: 6.7, face: F() } });
  W({ name: 'wade2', act: 'wade', x: 3.8, z: 34.5, y: -0.65, h: 2.4, react: { notice: 7.2, face: F() } });
  W({ name: 'wade3', act: 'wade', x: 15.5, z: 33.0, y: -0.5, h: -2.6, react: { notice: 6.9, face: F() } });

  // --- lifeguard
  M({ name: 'lifeguard', act: 'chair', x: -14, z: 23.85, y: 3.08, h: 0, suit: 0xe8463c });

  // --- frisbee
  M({ name: 'fris1', act: 'frisbee', x: -22, z: 3.4, h: Math.atan2(-8, 5) });
  M({ name: 'fris2', act: 'frisbee', x: -30, z: 9.6, h: Math.atan2(8, -5), seed: 1.3 });
  W({ name: 'frisW', act: 'sit', x: -26, z: 1.5, h: 0.6, react: { notice: 6.6, tUp: 14, face: F(), walkIn: 1.5 } });

  // --- sunbathers
  M({ name: 'sunM1', act: 'lie', x: 9.2, z: -4.5, h: Math.PI, armsUp: true });
  M({ name: 'sunM2', act: 'lie', x: -15.5, z: -8.5, h: 0.2 });
  const lying = [[-4.6, 3.4, 3.0], [6.6, 2.8, 2.8], [-10.4, -3.0, 0.4], [14.2, 6.2, 3.3], [-18.5, 12.2, 1.4], [18.4, -6.2, 2.0]];
  lying.forEach(([x, z, h], i) => W({ name: 'lieW' + i, act: 'lie', x, z, h, armsUp: i % 2 === 0,
    react: { notice: 6.8 + R() * 2.5, tUp: 9 + R() * 7, up: i % 2 === 0 ? 'stand' : 'sit', face: F(), walkIn: 1 } }));
  const sitting = [[-6.4, -2.2, 0.3], [9.8, -1.8, -0.4], [16.5, 15.2, -1.2], [-12.5, -5.5, 0.6]];
  sitting.forEach(([x, z, h], i) => W({ name: 'sitW' + i, act: 'sit', x, z, h,
    react: { notice: 6.5 + R() * 2, tUp: 12 + R() * 8, up: i === 2 ? 'sit' : 'stand', face: F(), walkIn: 1 } }));

  // --- standing, chatting
  M({ name: 'chatM', act: 'stand', chat: true, x: 12.2, z: 13.8, h: -2.4 });
  W({ name: 'chatW1', act: 'stand', chat: true, x: 11.3, z: 14.7, h: 2.2,
      react: { notice: 6.15, gaze: [[6.2, 8.0, V3(12.2, 13.8)]], face: F(), walkIn: 2.4 } });
  W({ name: 'pairW1', act: 'stand', chat: true, x: -13.2, z: 5.8, h: 0.9, react: { notice: 6.8, face: F(), walkIn: 2.6 } });
  W({ name: 'pairW2', act: 'stand', chat: true, x: -12.2, z: 6.6, h: -2.2, react: { notice: 6.9, face: F(), walkIn: 2.2 } });

  // --- walkers on the wet sand and the dry sand
  M({ name: 'walkM1', act: 'walk', x: 26, z: 26.5, h: -Math.PI / 2, v: 1.25 });
  M({ name: 'walkM2', act: 'walk', x: -34, z: -13, h: Math.PI / 2, v: 1.2 });
  W({ name: 'walkW1', act: 'walk', x: -24, z: 25.6, h: Math.PI / 2, v: 1.15, react: { notice: 6.6, face: F(), walkIn: 2 } });
  W({ name: 'walkW2', act: 'walk', x: -24.9, z: 26.4, h: Math.PI / 2, v: 1.15, react: { notice: 6.7, face: F(), walkIn: 2 } });
  W({ name: 'walkW3', act: 'walk', x: 30, z: -8, h: -Math.PI / 2, v: 1.05, react: { notice: 7.0, face: F(), walkIn: 2.5 } });

  // --- ice cream at the boardwalk stand (x = 26)
  M({ name: 'icecream', act: 'stand', x: 26.4, z: -38.4, y: 1.03, h: Math.PI });
  W({ name: 'iceW', act: 'stand', chat: true, x: 25.2, z: -38.2, y: 1.03, h: Math.PI - 0.5, react: { notice: 6.5, face: F() } });
  W({ name: 'iceW2', act: 'stand', x: 22.5, z: -37.8, y: 1.03, h: -2.2, react: { notice: 6.9, face: F() } });
  return L;
}

function buildPeople(scene) {
  for (const o of cast()) {
    const p = new Person(o);
    const hd = o.h; p.y = o.y || 0;
    p.behave = t => behave(p, t);
    if (o.act === 'carry' || o.act === 'walk') p.walkVel = new THREE.Vector3(Math.sin(hd) * o.v, 0, Math.cos(hd) * o.v);
    scene.add(p.root);
    PEOPLE.list.push(p); PEOPLE.byName[o.name] = p;
  }
  // Snapshot the instant of the event: hands for the dropped props, and the sample
  // points each man's sand burst starts from (exactly the shape of his body).
  poseAll(T_EVENT - 1e-4);
  const pts = [], vel = [], gnd = [], col = [];
  const tmp = new THREE.Vector3(), ctr = new THREE.Vector3();
  const DR = mulberry32(4242);
  for (const p of PEOPLE.list) {
    p.root.updateMatrixWorld(true);
    p.snap = { l: p.lA.hand.getWorldPosition(new THREE.Vector3()), r: p.rA.hand.getWorldPosition(new THREE.Vector3()) };
    if (p.sex !== 'm') continue;
    p.body.getWorldPosition(ctr);
    const ground = p.act === 'ride' || p.act === 'surf' ? -0.2 : (p.y || 0) + 0.02;
    const N = 340;
    for (let i = 0; i < N; i++) {
      const m = p.meshes[Math.floor(DR() * p.meshes.length)];
      const pa = m.geometry.attributes.position, k = Math.floor(DR() * pa.count);
      tmp.fromBufferAttribute(pa, k).applyMatrix4(m.matrixWorld);
      tmp.x += (DR() - 0.5) * 0.03; tmp.y += (DR() - 0.5) * 0.03; tmp.z += (DR() - 0.5) * 0.03;
      pts.push(tmp.x, tmp.y, tmp.z);
      const ox = tmp.x - ctr.x, oz = tmp.z - ctr.z, ol = Math.hypot(ox, oz) || 1;
      const burst = 0.35 + DR() * 0.9;
      vel.push(ox / ol * burst + (DR() - 0.5) * 0.4, 0.2 + DR() * 0.9, oz / ol * burst + (DR() - 0.5) * 0.4);
      gnd.push(ground + DR() * 0.04);
      const c = new THREE.Color(0xd9b277).multiplyScalar(0.75 + DR() * 0.4);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts.length), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.065, vertexColors: true, transparent: true, depthWrite: false }));
  dust.frustumCulled = false;
  dust.userData = { p0: pts, v0: vel, gnd };
  scene.add(dust);
  PEOPLE.dust = dust;
}

function poseAll(t) {
  for (const p of PEOPLE.list) {
    const b = p.behave(t);
    p.apply(b.P, b.x, b.y, b.z, b.h);
    p.root.visible = !(p.sex === 'm' && t >= T_EVENT);
  }
}

// Sand bursts: hold the body's shape for a beat, puff outward, fall, and settle into a pile.
function writeDust(t) {
  const D = PEOPLE.dust, u = D.userData, pa = D.geometry.attributes.position;
  const dt = t - T_EVENT;
  D.visible = dt >= 0;
  if (dt < 0) return;
  const n = pa.count;
  for (let i = 0; i < n; i++) {
    const hold = 0.06 + hash1(i * 0.37) * 0.12;
    const tt = Math.max(0, dt - hold);
    const x0 = u.p0[i * 3], y0 = u.p0[i * 3 + 1], z0 = u.p0[i * 3 + 2];
    const vx = u.v0[i * 3], vy = u.v0[i * 3 + 1], vz = u.v0[i * 3 + 2];
    // time to hit the ground
    const g = 9.81 * 0.75, gy = u.gnd[i];
    const disc = vy * vy + 2 * g * Math.max(0, y0 - gy);
    const tl = (vy + Math.sqrt(disc)) / g;
    const te = Math.min(tt, tl);
    const drag = (1 - Math.exp(-te * 2.2)) / 2.2;
    let x = x0 + vx * drag, z = z0 + vz * drag, y = y0 + vy * te - 0.5 * g * te * te;
    if (tt >= tl) y = gy;
    if (gy < 0 && tt >= tl) y = -2;          // into the water: gone
    pa.setXYZ(i, x, y, z);
  }
  pa.needsUpdate = true;
  D.material.opacity = 1;
  
}

// ---------- YOU: the POV body (hands and feet in shot) ----------
function buildYou(scene) {
  const you = new Person({ sex: 'm', ht: 1.8, fingers: true, skin: 0xb07650, hair: 0x2a1d17, suit: 0x1b2a4a, seed: 1 });
  you.head.visible = false; you.torso.children[0].visible = false;
  scene.add(you.root);
  const P = basePose('sit', you.s);
  Object.assign(P, { torX: 0.28, lHipX: -1.52, rHipX: -1.48, lKnX: 0.32, rKnX: 0.2, lAnX: -0.35, rAnX: -0.3,
    lShX: 0.6, rShX: 0.6, lShZ: 0.22, rShZ: -0.22, lElX: 0, rElX: 0, lHipZ: 0.12, rHipZ: -0.1 });
  you.baseP = P;
  you.apply(P, 0, 0.03, -0.12, 0);
  PEOPLE.you = you;
}
function poseYou(t) {
  const you = PEOPLE.you, P = Object.assign({}, you.baseP);
  P.lKnX += 0.08 * Math.sin(t * 0.7); P.lAnX += 0.15 * Math.sin(t * 0.9);
  // at the end you lift your hands and look at them
  const w = Math.max(1 - smooth(3.0, 3.9, t), smooth(30.2, 31.2, t) * (1 - smooth(32.4, 33.4, t)));
  P.lShX = lerp(P.lShX, -0.75, w); P.rShX = lerp(P.rShX, -0.75, w);
  P.lElX = lerp(P.lElX, -1.0, w); P.rElX = lerp(P.rElX, -1.0, w);
  P.lShZ = lerp(P.lShZ, -0.12, w); P.rShZ = lerp(P.rShZ, 0.12, w); P.torX = lerp(P.torX, 0.05, w);
  // small flinch at the event
  const f = smooth(T_EVENT, T_EVENT + 0.25, t) * (1 - smooth(T_EVENT + 0.6, T_EVENT + 1.4, t));
  P.torX -= 0.12 * f; P.lShX -= 0.15 * f; P.rShX -= 0.15 * f;
  you.apply(P, 0, 0.03, -0.12, 0);
}
