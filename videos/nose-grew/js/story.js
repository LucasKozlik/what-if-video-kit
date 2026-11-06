'use strict';
// =====================================================================
// STORY — ten days, one family, one nose. Everything here is a pure
// function of film time t: update(t) poses the cast, sizes the nose and
// moves the props. No state carried between frames, so any frame can be
// rendered on its own and every render of it is identical.
// =====================================================================

const CAST = {};
let NOSE;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _col = new THREE.Color();

function buildCast(scene) {
  const skinM = '#c48a64';
  const marcus = (name, o) => new Person(scene, Object.assign({
    name, h: 1.82, headScale: 1.25, skin: skinM, hair: '#2b1d16', brow: '#1f1510', hairStyle: 'short',
    pants: '#1f2a44', shoes: '#2a1a12', longNose: true, seed: 1, lip: '#8e4a3c',
  }, o));
  CAST.mShirt = marcus('mShirt', { shirt: '#f3f1ec', sleeve: '#f3f1ec', forearm: '#f3f1ec' });
  CAST.mSuit = marcus('mSuit', { shirt: '#1f2a44', sleeve: '#1f2a44', jacket: true, tie: '#8a2533' });
  CAST.mLinen = marcus('mLinen', { shirt: '#e2cfae', sleeve: '#e2cfae', pants: '#c9b694', shoes: '#8a6a4a' });
  CAST.elena = new Person(scene, {
    name: 'elena', h: 1.68, headScale: 1.25, skin: '#e3b393', hair: '#3a2418', brow: '#3a2418', hairStyle: 'long',
    shirt: '#1f6f5c', sleeve: '#e3b393', forearm: '#e3b393', pants: '#1f6f5c', legs: '#e3b393', shin: '#e3b393',
    dress: '#1f6f5c', shoes: '#c9a461', seed: 2, blush: true, lip: '#b0424a',
  });
  CAST.leo = new Person(scene, {
    name: 'leo', h: 1.28, headScale: 1.42, kid: true, skin: '#d8a37e', hair: '#5a3a22', hairStyle: 'tousled',
    shirt: '#e0463b', sleeve: '#e0463b', forearm: '#d8a37e', pants: '#2f5d9a', legs: '#2f5d9a', shin: '#d8a37e', shoes: '#f2f2f2', seed: 3,
  });
  CAST.mia = new Person(scene, {
    name: 'mia', h: 1.08, headScale: 1.5, kid: true, skin: '#e9bd9c', hair: '#6b4428', hairStyle: 'pigtails',
    shirt: '#f6c234', sleeve: '#f6c234', forearm: '#e9bd9c', pants: '#f6c234', legs: '#e9bd9c', shin: '#e9bd9c',
    dress: '#f6c234', shoes: '#ff6d9a', seed: 4, blush: true,
  });
  NOSE = new Nose(scene, CAST.mSuit, skinM);
  // coffee foam that stays on the tip after Day 2
  CAST.foam = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#d9b48a', roughness: 0.7 }));
  scene.add(CAST.foam);
}

// ---------- helpers ----------
const W = (set, x, y, z) => _a.set(SETS[set].origin.x + x, SETS[set].origin.y + y, SETS[set].origin.z + z);
const WV = (set, x, y, z) => new THREE.Vector3(SETS[set].origin.x + x, SETS[set].origin.y + y, SETS[set].origin.z + z);
function show(p, set, x, y, z, heading, lie = 0) {
  p.root.visible = true;
  const o = SETS[set].origin;
  p.root.position.set(o.x + x, o.y + y, o.z + z);
  p.root.rotation.set(lie, heading, 0);
  p.root.rotation.order = 'YXZ';
}
const ss = (a, b, x) => smooth(a, b, x);
const ramp = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

function headPos(p, out) {
  const s = p.s;
  return out.set(0, p.legLen + p.P.hipY + 0.05 * s + 0.5 * s + 0.09 * s + p.R * 0.95, 0).applyMatrix4(_m4.makeRotationFromEuler(p.root.rotation)).add(p.root.position);
}
// turn head (and a little torso) toward a world point
function look(p, tx, ty, tz, k = 1, torso = 0.25) {
  const h = headPos(p, _d);
  const dx = tx - h.x, dz = tz - h.z, dy = ty - h.y;
  const yaw = clamp(wrapA(Math.atan2(dx, dz) - p.root.rotation.y), -1.6, 1.6);
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
  p.P.headY += yaw * (1 - torso) * k; p.P.torY += yaw * torso * k;
  p.P.headX += clamp(pitch, -0.8, 0.9) * k;
  p.F.lookX = clamp(yaw * 0.6, -1, 1) * k * 0.6; p.F.lookY = clamp(-pitch, -1, 1) * k * 0.5;
}
// numeric 2-bone reach: solve shoulder X/Z + elbow X so the hand lands on a world point
function reach(p, side, target, k = 1) {
  if (k <= 0.001) return;
  const P = p.P, sh = side > 0 ? p.lSh : p.rSh, el = side > 0 ? p.lEl : p.rEl, hand = side > 0 ? p.lHand : p.rHand;
  const kx = side > 0 ? 'lShX' : 'rShX', kz = side > 0 ? 'lShZ' : 'rShZ', ke = side > 0 ? 'lElX' : 'rElX';
  p.apply(0); p.root.updateMatrixWorld(true);
  const x0 = [P[kx], P[kz], P[ke]];
  const x = x0.slice();
  const lim = [[-3.1, 1.0], side > 0 ? [-0.4, 1.6] : [-1.6, 0.4], [-2.6, 0]];
  const err = () => {
    sh.rotation.x = x[0]; sh.rotation.z = x[1]; el.rotation.x = x[2];
    sh.updateMatrixWorld(true);
    return hand.getWorldPosition(_c).distanceToSquared(target);
  };
  let best = err(), step = 0.5;
  for (let it = 0; it < 26; it++) {
    for (let j = 0; j < 3; j++) {
      for (const sg of [1, -1]) {
        const old = x[j]; x[j] = clamp(old + sg * step, lim[j][0], lim[j][1]);
        const e = err(); if (e < best) { best = e; } else x[j] = old;
      }
    }
    step *= 0.72;
  }
  P[kx] = lerp(x0[0], x[0], k); P[kz] = lerp(x0[1], x[1], k); P[ke] = lerp(x0[2], x[2], k);
}
function hideAll() {
  for (const k of ['mShirt', 'mSuit', 'mLinen', 'elena', 'leo', 'mia']) CAST[k].root.visible = false;
  CAST.foam.visible = false;
}
function finish(p, t) { p.apply(t); }

// a nose "boing" wobble that rings out after each growth spurt
function growWob(t, d) {
  const x = t - DAY_T(d) - GROW_AT[d];
  return x < 0 ? 0 : Math.exp(-x * 4) * 0.5;
}

// ---------- FX words (comic onomatopoeia), positioned in 3D ----------
const FXW = [];   // filled per frame: { text, p: world vec, a: 0..1 age, cls }
function fx(t, t0, dur, text, pos, cls = '') {
  if (t < t0 || t > t0 + dur) return;
  FXW.push({ text, p: pos.clone(), a: (t - t0) / dur, cls, age: t - t0 });
}

// =====================================================================
// The days
// =====================================================================
const DAYS = {};

// ---- DAY 1: the mirror ----
DAYS[1] = (t, lt) => {
  const m = CAST.mShirt; NOSE.person = m;
  show(m, 'bath', 0, 0, -1.2, Math.PI);
  const P = m.stand(t), F = m.F;
  P.torX = 0.12 + ss(0.5, 1.5, lt) * 0.06;          // leaning in to the mirror
  F.smile = 0.25;
  if (lt > 1.2) { F.squint = ss(1.2, 1.7, lt) * (1 - ss(3.4, 3.8, lt)) * 0.7; F.browL = ss(1.2, 1.7, lt) * 0.9 * (1 - ss(3.5, 3.9, lt)); F.browR = -0.4 * ss(1.2, 1.7, lt) * (1 - ss(3.5, 3.9, lt)); }
  P.headZ = Math.sin(clamp(lt - 1.3, 0, 2) * 2.6) * 0.16 * (1 - ss(3.2, 3.6, lt));
  P.headY = Math.sin(clamp(lt - 1.5, 0, 2) * 2.0) * 0.18 * (1 - ss(3.2, 3.6, lt));
  F.smile = lt < 3.6 ? lerp(0.25, -0.2, ss(1.3, 1.8, lt)) : lerp(-0.2, 0.75, ss(3.6, 4.1, lt));
  // the shrug: "it's nothing"
  const sh = ss(3.5, 3.9, lt) * (1 - ss(4.4, 4.9, lt));
  P.lShZ += sh * 0.35; P.rShZ -= sh * 0.35; P.lElX -= sh * 1.0; P.rElX -= sh * 1.0; P.lShX -= sh * 0.4; P.rShX -= sh * 0.4;
  P.headZ += sh * 0.12; F.browL += sh * 0.8; F.browR += sh * 0.8;
  finish(m, t);
  // he pokes the tip with a finger around T.touch
  const tk = ss(T.touch - 0.6, T.touch - 0.15, t) * (1 - ss(T.touch + 0.35, T.touch + 0.8, t));
  if (tk > 0) { NOSE.update(t, { L: noseLen(t) }); NOSE.tip(_b); _b.y -= 0.01; _b.x += 0.01; reach(m, -1, _b, tk); finish(m, t); }
  NOSE.update(t, { L: noseLen(t), wob: growWob(t, 1) * 0.004 + (t > T.touch ? Math.exp(-(t - T.touch) * 5) * 0.006 : 0) });
};

// ---- DAY 2: espresso ----
DAYS[2] = (t, lt) => {
  const m = CAST.mSuit, e = CAST.elena; NOSE.person = m;
  const S = SETS.kitchen;
  show(m, 'kitchen', 0, 0, 1.0, Math.PI);
  const P = m.stand(t); m.sit(0.78);
  P.torX = 0.1; P.lHipZ = 0.15; P.rHipZ = -0.15;
  const F = m.F;
  // cup: saucer -> mouth -> back down
  const up = ss(T.cupUp - 0.1, T.cupUp + 0.7, t) * (1 - ss(T.foam + 0.2, T.foam + 0.8, t));
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.4 });
  const sx = S.origin.x, sz = S.origin.z;
  const rest = _b.set(sx + 0.12, 0.965, sz + 0.34);
  NOSE.tip(_c);
  const atNose = _d.set(_c.x, _c.y - 0.045, _c.z + 0.01);
  const cupP = new THREE.Vector3().lerpVectors(rest, atNose, up);
  // a little settle in the dip
  if (t > T.plip - 0.05 && t < T.foam) cupP.y -= Math.sin(ramp(T.plip - 0.05, T.plip + 0.3, t) * Math.PI) * 0.012;
  S.cup.position.copy(cupP).sub(S.origin); S.cup.rotation.set(0, 0.6, up * 0.18);
  const hold = ss(T.cupUp - 0.4, T.cupUp, t) * (1 - ss(T.foam + 0.6, T.foam + 1.1, t));
  reach(m, -1, _c.copy(cupP).add(new THREE.Vector3(0.05, 0.03, 0)), hold);
  if (hold < 0.5) { P.rShX = -0.5; P.rElX = -1.1; P.rShZ = -0.1; }
  P.lShX = -0.55; P.lElX = -1.0; P.lShZ = 0.15;
  // cross-eyed at the dip
  const dip = ss(T.plip - 0.1, T.plip + 0.1, t) * (1 - ss(T.foam + 0.8, T.foam + 1.3, t));
  F.lookX = 0; F.lookY = -0.6 * dip; F.browL = F.browR = dip * 0.9; F.smile = lerp(0.35, -0.35, dip);
  m.cross = dip;
  P.headX = 0.08 + dip * 0.12;
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.4, wob: growWob(t, 2) * 0.01 });
  S.coffee.visible = true;
  if (t > T.plip + 0.15) {        // foam on the tip from now on
    const f = CAST.foam; f.visible = true; NOSE.tip(f.position); NOSE.upAt(1, _c);
    f.position.addScaledVector(_c, NOSE.radAt(0.96) * 0.6);
    const r = NOSE.baseRadius(NOSE.L) * 0.7; f.scale.set(r, r * 0.55, r);
  }
  // Elena: leaning on the counter, head tilting, then a stifled laugh
  show(e, 'kitchen', 0.15, 0, -0.95, 0);
  const E = e.stand(t);
  E.torX = 0.22; E.hipX = 0.05;
  finish(e, t);
  reach(e, 1, W('kitchen', 0.45, 0.96, -0.4), 1); reach(e, -1, W('kitchen', -0.15, 0.96, -0.42), 1);
  E.headZ = 0.32 * ss(7.6, 8.4, t) * (1 - ss(T.plip, T.plip + 0.3, t)) + (t > T.plip ? -0.12 : 0);
  look(e, m.root.position.x, 1.5, m.root.position.z - 0.2, 0.8);
  e.F.browL = 0.6 * ss(7.6, 8.4, t); e.F.browR = 0.2 + 0.4 * ss(7.6, 8.4, t); e.F.smile = lerp(0.3, -0.05, ss(7.6, 8.2, t));
  const lol = ss(T.plip + 0.2, T.plip + 0.6, t);
  if (lol > 0) {
    e.F.smile = 1; e.F.squint = lol * 0.7; e.F.browL = e.F.browR = 0.7;
    finish(e, t); headPos(e, _c); _c.y -= 0.12; _c.z += 0.12;
    reach(e, -1, _c, lol);
    E.torX = 0.22 + Math.abs(Math.sin(t * 12)) * 0.05 * lol;
  }
  finish(e, t);
  fx(t, T.plip, 0.9, 'plip!', NOSE.tip(new THREE.Vector3()).add(new THREE.Vector3(-0.12, 0.08, 0)));
};

// ---- DAY 3: front hall, sunglasses ----
DAYS[3] = (t, lt) => {
  const m = CAST.mSuit, leo = CAST.leo, mia = CAST.mia; NOSE.person = m;
  const S = SETS.hall;
  show(m, 'hall', 0.05, 0, -1.6, 0);
  const P = m.stand(t), F = m.F;
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.2, wob: growWob(t, 3) * 0.02 });
  // glasses: right hand -> perched on the nose, temples hanging in the air
  const g = S.glasses;
  const on = ss(T.glassesOn - 0.9, T.glassesOn, t);
  NOSE.at(NOSE.uAt(0.075), _b); NOSE.upAt(NOSE.uAt(0.075), _c);
  const perched = _b.clone().addScaledVector(_c, NOSE.radAt(NOSE.uAt(0.075)) + 0.012);
  m.rHand.getWorldPosition(_d);
  const inHand = _d.clone().add(new THREE.Vector3(0.0, 0.02, 0.05));
  g.position.lerpVectors(inHand, perched, on).sub(S.origin);
  NOSE.dirAt(NOSE.uAt(0.075), _c);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _c);
  if (on < 1) g.rotateX((1 - on) * 0.8);
  // arms: hand brings them up
  const lift = ss(T.glassesOn - 1.3, T.glassesOn - 0.5, t) * (1 - ss(T.glassesOn + 0.1, T.glassesOn + 0.5, t));
  if (lift > 0) { reach(m, -1, perched.clone().add(new THREE.Vector3(-0.08, -0.02, 0.0)), lift); reach(m, 1, perched.clone().add(new THREE.Vector3(0.08, -0.02, 0.0)), lift); }
  else { P.rShX = -0.35 * (1 - on); P.rElX = -1.2 * (1 - on); }
  // the "cool" pose once they're on
  const cool = ss(T.glassesOn + 0.3, T.glassesOn + 0.7, t);
  P.lShZ += cool * 0.12; F.smile = 0.35 + cool * 0.5; F.browL = cool * 0.7; F.browR = cool * 0.3; P.headX = -cool * 0.08; P.headZ = cool * 0.07;
  P.torX = -cool * 0.04;
  // he notices the sproing
  const notice = ss(DAY_T(3) + 0.5, DAY_T(3) + 0.8, t) * (1 - ss(DAY_T(3) + 1.6, DAY_T(3) + 2.0, t));
  m.cross = notice; F.browL += notice * 0.8; F.browR += notice * 0.8; F.open = notice * 0.3;
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.2, wob: growWob(t, 3) * 0.02 });
  if (t > T.plip + 0.15) {
    // foam was wiped off by now
  }
  // kids
  const laughK = ss(T.kidsLaugh - 0.2, T.kidsLaugh + 0.2, t);
  show(leo, 'hall', -0.32, 0, 1.0, Math.PI + 0.15);
  const L = leo.stand(t); leo.laugh(t, laughK);
  if (laughK > 0.5) { finish(leo, t); NOSE.tip(_b); reach(leo, -1, _b, 0.8 * laughK * (0.5 + 0.5 * Math.sin(t * 2.3))); }
  look(leo, m.root.position.x, 1.7, m.root.position.z, 0.6 * (1 - laughK * 0.5));
  finish(leo, t);
  // Mia: laughs, then collapses onto the floor kicking her feet
  const floorK = ss(T.miaFloor - 0.2, T.miaFloor + 0.15, t);
  if (floorK < 0.5) {
    show(mia, 'hall', 0.3, Math.abs(Math.sin(t * 7)) * 0.08 * laughK, 0.95, Math.PI - 0.15);
    mia.stand(t); mia.laugh(t, laughK);
    mia.P.lShX = -2.6 * laughK; mia.P.rShX = -2.6 * laughK; mia.P.lElX = -0.3; mia.P.rElX = -0.3;
  } else {
    show(mia, 'hall', 0.35, 0.12, 0.95, Math.PI - 0.6, -Math.PI / 2);
    const M_ = mia.stand(t); mia.laugh(t, 1);
    M_.torX = 0; M_.headX = -0.2 + Math.sin(t * 9) * 0.1;
    M_.lHipX = -1.2 + Math.sin(t * 14) * 0.5; M_.rHipX = -1.2 - Math.sin(t * 14) * 0.5; M_.lKnX = 1.2; M_.rKnX = 1.2;
    M_.lShX = -0.4; M_.rShX = -0.4; M_.lElX = -1.8; M_.rElX = -1.8;
  }
  finish(mia, t);
  if (t > T.kidsLaugh) {
    fx(t, T.kidsLaugh, 1.5, 'HA HA HA', W('hall', -0.25, 1.6, 0.9).clone());
    fx(t, T.kidsLaugh + 0.35, 1.4, 'hee hee!', W('hall', 0.35, 1.3, 0.9).clone(), 'small');
    fx(t, T.miaFloor, 1.4, 'HAHAHA', W('hall', 0.45, 0.6, 0.9).clone());
  }
};

// ---- DAY 4: living room — kiss from the side, Leo measures ----
DAYS[4] = (t, lt) => {
  const m = CAST.mSuit, e = CAST.elena, leo = CAST.leo; NOSE.person = m;
  const S = SETS.living;
  show(m, 'living', -0.3, 0, 0.3, Math.PI / 2);
  const P = m.stand(t), F = m.F;
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.15 });
  // Elena: front approach -> BOOP -> walks round to his right side -> kiss
  const b0 = T.boop - 0.9, side = ss(T.boop + 0.35, T.boop + 1.25, t);
  const ex = lerp(lerp(0.75, 0.43, ss(b0, T.boop, t)) + 0.08 * ss(T.boop, T.boop + 0.15, t) * (1 - side), -0.28, side);
  const ez = lerp(0.3, 0.68, side);
  const eh = lerp(-Math.PI / 2, Math.PI, side);
  show(e, 'living', ex, 0, ez, eh);
  const E = e.stand(t);
  if (side > 0.05 && side < 0.95) e.walk(t * 9, 0.6);
  const lean = ss(b0 + 0.4, T.boop, t) * (1 - ss(T.boop, T.boop + 0.2, t)) * 0.25 + ss(T.mwah - 0.5, T.mwah - 0.1, t) * (1 - ss(T.mwah + 0.4, T.mwah + 0.8, t)) * 0.2;
  E.torX += lean; e.F.smile = 0.7;
  const boopK = ss(T.boop - 0.05, T.boop + 0.05, t) * (1 - ss(T.boop + 0.5, T.boop + 0.8, t));
  E.headX -= boopK * 0.25; e.cross = boopK; e.F.browL = e.F.browR = boopK; e.F.open = boopK * 0.4; e.F.smile = lerp(0.7, 0.2, boopK);
  const kiss = ss(T.mwah - 0.4, T.mwah, t) * (1 - ss(T.mwah + 0.5, T.mwah + 0.9, t));
  E.headZ = kiss * 0.45; e.F.squint = kiss; e.F.smile = lerp(e.F.smile, -0.2, kiss); e.F.open = Math.max(e.F.open, kiss * 0.15);
  look(e, m.root.position.x, 1.68, m.root.position.z, 0.7);
  finish(e, t);
  // Marcus: tries to stay casual; blushes at the kiss
  F.smile = 0.4 + kiss * 0.5; F.squint = kiss * 0.6; F.browL = boopK * 0.8; F.browR = boopK * 0.8;
  P.headY = lerp(-0.05, 0.12, side) * (1 - ss(T.tapeOut - 0.4, T.tapeOut, t)); P.headZ = -kiss * 0.08;
  // Leo on a pouf, pulling the tape from the face to the tip
  show(leo, 'living', 0.1, 0.42, -0.3, 0);
  if (t < 20.8) leo.root.visible = false;
  const L = leo.stand(t);
  const tape = ss(T.tapeOut, T.tapeOut + 0.6, t);
  finish(leo, t); finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.15, wob: growWob(t, 4) * 0.03 + boopK * 0.01 * Math.sin(t * 40) });
  look(leo, NOSE.tip(_b).x, _b.y, _b.z, 1);
  const face = NOSE.at(0.02, new THREE.Vector3()).add(new THREE.Vector3(0, -0.035, -0.05));
  const tipP = NOSE.tip(new THREE.Vector3()).add(new THREE.Vector3(0.0, -0.03, -0.05));
  const endP = new THREE.Vector3().lerpVectors(face, tipP, tape);
  reach(leo, -1, face, ss(T.tapeOut - 0.8, T.tapeOut - 0.3, t)); reach(leo, 1, endP, ss(T.tapeOut - 0.8, T.tapeOut - 0.3, t));
  leo.F.smile = 0.6; leo.F.browL = 0.6 * tape; leo.F.open = 0.25 * tape;
  finish(leo, t);
  S.tape.visible = tape > 0.01;
  const len = face.distanceTo(endP);
  S.tape.scale.x = Math.max(0.01, len); S.tape.position.copy(face).lerp(endP, 0.5).sub(S.origin);
  S.tape.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _c.subVectors(endP, face).normalize());
  S.tcase.position.copy(face).sub(S.origin); S.tcase.position.y -= 0.02;
  S.tcase.visible = t >= 20.8;
  fx(t, T.boop, 0.8, 'BOOP', NOSE.tip(new THREE.Vector3()).add(new THREE.Vector3(0.05, 0.12, 0)));
  fx(t, T.mwah, 0.9, 'mwah!', W('living', -0.25, 1.95, 0.6).clone(), 'pink');
};

// ---- DAY 5: hallway — the frame, then the doorway ----
DAYS[5] = (t, lt) => {
  const m = CAST.mSuit; NOSE.person = m;
  const S = SETS.hallway;
  const P = m.stand(t), F = m.F;
  if (t < 25.0) {
    // walking up the hall, then a head turn that sweeps the nose into a frame
    const z = lerp(-3.4, -2.35, ss(22.2, 23.5, t));
    show(m, 'hallway', 0.48, 0, z, 0);
    const spd = t < 23.5 ? 0.8 : 0;
    if (t < 23.5) m.walk((z + 3.4) / 0.7 * Math.PI * 2, 0.8);
    const turn = ss(T.frameKnock - 0.45, T.frameKnock, t) * (1 - ss(T.frameKnock + 0.5, T.frameKnock + 0.9, t) * 0.75);
    P.headY = turn * 1.25;
    const ouch = ss(T.frameKnock, T.frameKnock + 0.15, t) * (1 - ss(T.frameKnock + 0.7, T.frameKnock + 1.0, t));
    F.squint = ouch * 0.9; P.lShZ += ouch * 0.3; P.rShZ -= ouch * 0.3; F.smile = lerp(0.35, -0.5, ouch);
    F.browTilt = ouch;
  } else {
    // tiptoe through the doorway, nose lined up dead centre
    const z = lerp(1.15, 3.6, ramp(25.0, 27.4, t));
    show(m, 'hallway', 0, 0, z, 0);
    m.walk((z - 1.15) / 0.42 * Math.PI * 2, 0.55);
    P.lKnX += 0.25; P.rKnX += 0.25; P.hipY -= 0.04;             // creeping
    P.lShX = -0.7; P.rShX = -0.7; P.lElX = -1.7; P.rElX = -1.7; P.lShZ = 0.35; P.rShZ = -0.35;   // cat-burglar hands
    P.torX = 0.1; P.headX = -0.08;
    F.browL = 0.9; F.browR = 0.9; F.smile = -0.1; m.cross = 0.7; F.open = 0.1;
  }
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.12, wob: growWob(t, 5) * 0.04 + (t > 25 ? 0.006 * Math.sin(t * 9) : 0) });
  // frames: frame[1] knocked crooked; spring wobble, then it stays tilted
  const k = t - T.frameKnock;
  S.frames.forEach((f, i) => { f.children[0].rotation.z = 0; });
  if (k > 0) S.frames[1].children[0].rotation.z = 0.22 + Math.exp(-k * 3.5) * Math.sin(k * 14) * 0.3;
  fx(t, T.frameKnock, 0.8, 'CLACK', W('hallway', 0.95, 1.85, -2.0).clone());
};

// ---- DAY 6: dinner — nose on the table, Mia's napkin ----
DAYS[6] = (t, lt) => {
  const m = CAST.mLinen, e = CAST.elena, leo = CAST.leo, mia = CAST.mia; NOSE.person = m;
  const S = SETS.dining, O = S.origin;
  show(m, 'dining', -0.88, 0, 0.2, Math.PI / 2);
  const P = m.stand(t); m.sit(0.49);
  const down = ss(T.noseDown - 0.5, T.noseDown, t);
  P.torX = 0.12 + down * 0.08; P.headX = 0.05 + down * 0.12;
  const chew = Math.max(0, Math.sin(t * 9)) * 0.35 * ss(T.noseDown + 0.2, T.noseDown + 0.5, t);
  m.F.open = chew * 0.4; m.F.smile = 0.45;
  P.lShX = -0.6; P.lElX = -1.2; P.rShX = -0.55 - chew * 0.15; P.rElX = -1.1 + chew * 0.2; P.lShZ = 0.2; P.rShZ = -0.2;
  const napHit = ss(T.napkin, T.napkin + 0.2, t) * (1 - ss(T.napkin + 1.0, T.napkin + 1.4, t));
  m.cross = napHit * 0.8; m.F.browL = m.F.browR = napHit * 0.6;
  finish(m, t);
  const tableTop = (x, z) => (Math.abs(x - O.x) < 0.58 && Math.abs(z - O.z) < 1.6 ? 0.795 : -10);
  const knock = t > T.noseDown ? Math.exp(-(t - T.noseDown) * 9) * 0.015 * Math.sin((t - T.noseDown) * 50) : 0;
  NOSE.update(t, { L: noseLen(t), kappa: lerp(0.1, 1.4, down), phiMax: 1.0, floor: tableTop, wob: growWob(t, 6) * 0.05 * (1 - down) + knock });
  // Mia leans across and hangs her napkin on the tip
  show(mia, 'dining', 0.85, 0, 0.45, -Math.PI / 2);
  const Mi = mia.stand(t);
  const stand = ss(T.napkin - 1.2, T.napkin - 0.6, t) * (1 - ss(T.napkin + 0.6, T.napkin + 1.2, t));
  mia.sit(0.49 + stand * 0.25);
  Mi.lKnX *= 1 - stand * 0.6; Mi.rKnX *= 1 - stand * 0.6; Mi.lHipX *= 1 - stand * 0.5; Mi.rHipX *= 1 - stand * 0.5;
  Mi.torX = 0.15 + stand * 0.55;
  mia.F.smile = 0.8; mia.F.open = 0.3 * stand;
  finish(mia, t);
  NOSE.tip(_b); NOSE.upAt(1, _c);
  const hookP = _b.clone().addScaledVector(_c, NOSE.radAt(0.97) + 0.005);
  const napF = ss(T.napkin - 0.5, T.napkin, t);
  const hand = mia.lHand.getWorldPosition(new THREE.Vector3());
  reach(mia, 1, hookP.clone().add(new THREE.Vector3(0.05, 0.08, 0.03)), stand);
  look(mia, hookP.x, hookP.y, hookP.z, 1);
  if (t > T.napkin + 0.3) mia.laugh(t, ss(T.napkin + 0.3, T.napkin + 0.6, t) * 0.8);
  finish(mia, t);
  mia.lHand.getWorldPosition(hand);
  const nap = S.napkin;
  nap.visible = true;
  if (napF < 1) { nap.position.copy(hand).sub(O); nap.position.y -= 0.08; nap.rotation.set(0.2, 0, 0.3); nap.scale.set(0.7, 0.9, 0.7); }
  else {
    nap.position.copy(hookP).sub(O); nap.position.y -= 0.075;
    const sw = Math.exp(-(t - T.napkin) * 3) * Math.sin((t - T.napkin) * 10) * 0.25;
    nap.rotation.set(0, 0.5, sw); nap.scale.set(1, 1, 1);
  }
  if (t < T.napkin - 1.2) { nap.position.set(0.4, 0.81, 0.45); nap.rotation.set(Math.PI / 2, 0, 0); nap.scale.set(0.8, 0.25, 0.8); }
  // Leo and Elena
  show(leo, 'dining', 0.85, 0, -0.45, -Math.PI / 2);
  leo.stand(t); leo.sit(0.49); leo.P.torX = 0.1; leo.P.lShX = -0.6; leo.P.lElX = -1.0; leo.P.rShX = -0.6; leo.P.rElX = -1.0;
  look(leo, hookP.x, hookP.y, hookP.z, 0.8);
  if (t > T.napkin + 0.2) leo.laugh(t, 0.9 * ss(T.napkin + 0.2, T.napkin + 0.5, t));
  finish(leo, t);
  show(e, 'dining', 0, 0, 1.95, Math.PI);
  e.stand(t); e.sit(0.49); e.P.torX = 0.08;
  look(e, m.root.position.x, 1.45, m.root.position.z, 0.8);
  e.F.smile = 0.7; e.F.browL = 0.3; e.F.browR = 0.5;
  const facepalm = ss(T.napkin + 0.3, T.napkin + 0.7, t);
  if (facepalm > 0) { finish(e, t); headPos(e, _c); _c.y += 0.02; _c.z -= 0.13; reach(e, 1, _c, facepalm); e.F.smile = 0.9; e.F.squint = facepalm * 0.8; e.P.headX += facepalm * 0.2; }
  finish(e, t);
  if (t > T.noseDown) fx(t, T.noseDown, 0.8, 'THUNK', NOSE.at(0.85, new THREE.Vector3()).add(new THREE.Vector3(0, 0.18, 0)));
};

// ---- DAY 7: stairs + chandelier ----
DAYS[7] = (t, lt) => {
  const m = CAST.mLinen, e = CAST.elena; NOSE.person = m;
  const S = SETS.stairs, O = S.origin;
  // descending: x goes 2.1 -> 1.35, stop, look, then carefully onward
  const x = t < 33.6 ? lerp(2.05, 1.38, ramp(32.2, 33.6, t)) : t < 35.9 ? 1.38 : lerp(1.38, 0.55, ramp(35.9, 37.4, t));
  const sy = S.stairY(x);
  const y = sy;
  show(m, 'stairs', x, y, -0.62, -Math.PI / 2);
  const P = m.stand(t), F = m.F;
  if (t < 33.6 || t > 35.9) m.walk(x / 0.3 * Math.PI, 0.6);
  const turn = ss(33.6, 34.3, t) * (1 - ss(35.3, 35.9, t));
  P.headY = turn * 1.15; P.torY = turn * 0.18;
  const freeze = ss(T.ting, T.ting + 0.1, t) * (1 - ss(35.7, 36.0, t));
  F.browL = F.browR = freeze; F.open = freeze * 0.35; F.smile = lerp(0.3, -0.3, freeze); m.cross = freeze * 0.5;
  P.lShZ += freeze * 0.25; P.rShZ -= freeze * 0.25;
  finish(m, t);
  NOSE.update(t, { L: noseLen(t), kappa: 0.18, wob: growWob(t, 7) * 0.05 + freeze * 0.004 * Math.sin(t * 30) });
  // chandelier: swings after the hit; selected crystals drop and land exactly at CRYSTAL_LAND
  const hit = t - T.ting;
  const sw = hit > 0 ? Math.exp(-hit * 1.2) * Math.sin(hit * 5.5) : 0;
  S.chand.rotation.set(sw * 0.12, 0, sw * 0.08);
  S.chand.updateMatrixWorld(true);
  for (const c of S.crystals) { c.m.position.copy(c.home); c.m.rotation.set(0, c.a, 0); c.m.visible = true; }
  for (const [i, ft] of CRYSTAL_FALLS) {
    const c = S.crystals[i % S.crystals.length]; if (!c) continue;
    const u = t - ft;
    if (u < 0) { c.m.rotation.z = Math.sin(t * 20 + i) * 0.3 * (hit > 0 ? 1 : 0); continue; }
    // world start, fall in world, then convert back to chandelier-local
    const start = c.home.clone().applyMatrix4(S.chand.matrixWorld);
    const h0 = start.y - (O.y + 0.03);
    const g = 2 * h0 / (CRYSTAL_LAND * CRYSTAL_LAND);
    const dir = new THREE.Vector3(Math.cos(c.a * 3 + i), 0, Math.sin(c.a * 3 + i)).multiplyScalar(0.35);
    let wp;
    if (u < CRYSTAL_LAND) wp = start.clone().addScaledVector(dir, u).add(new THREE.Vector3(0, -0.5 * g * u * u, 0));
    else {
      const v = u - CRYSTAL_LAND, slide = 1 - Math.exp(-v * 4);
      wp = start.clone().addScaledVector(dir, CRYSTAL_LAND + slide * 0.25);
      wp.y = O.y + 0.03 + Math.abs(Math.sin(v * 9)) * Math.exp(-v * 7) * 0.08;
    }
    const inv = new THREE.Matrix4().copy(S.chand.matrixWorld).invert();
    c.m.position.copy(wp.applyMatrix4(inv));
    c.m.rotation.set(u * 9, c.a, u < CRYSTAL_LAND ? u * 7 : Math.PI / 2);
  }
  // Elena below, wincing at every tink
  show(e, 'stairs', 0.35, 0, 2.55, Math.PI + 0.35);
  const E = e.stand(t);
  look(e, O.x + 0.9, 2.6, O.z + 1.2, 0.8, 0.15);
  let wince = 0;
  for (const [, ft] of CRYSTAL_FALLS) { const u = t - ft - CRYSTAL_LAND; if (u > -0.05 && u < 0.4) wince = Math.max(wince, 1 - Math.abs(u - 0.1) / 0.35); }
  wince = Math.max(wince, ss(T.ting - 0.1, T.ting, t) * (1 - ss(T.ting + 0.3, T.ting + 0.6, t)));
  e.F.squint = wince; e.F.smile = lerp(0.2, -0.6, wince); e.F.browTilt = wince * 0.8; E.lShZ += wince * 0.3; E.rShZ -= wince * 0.3;
  E.lShX -= 0.5 * wince; E.rShX -= 0.5 * wince; E.lElX -= 1.6 * wince; E.rElX -= 1.6 * wince;
  finish(e, t);
  fx(t, T.ting, 0.9, 'TING!', W('stairs', 0.6, 4.25, 0.75).clone());
  fx(t, CRYSTAL_FALLS[1][1] + CRYSTAL_LAND, 0.7, 'tink', W('stairs', 0.4, 0.5, 1.4).clone(), 'small');
  fx(t, CRYSTAL_FALLS[4][1] + CRYSTAL_LAND, 0.7, 'tink', W('stairs', 1.3, 0.5, 1.0).clone(), 'small');
  fx(t, CRYSTAL_FALLS[6][1] + CRYSTAL_LAND, 0.7, 'tink!', W('stairs', 0.8, 0.6, 1.8).clone(), 'small');
};

// ---- DAY 8: bedroom, night ----
const BED_PATH = [[-0.43, 1.32, -1.08], [-0.38, 1.62, -0.45], [-0.3, 1.5, 0.4], [-0.2, 1.08, 1.35], [-0.1, 0.52, 2.35], [-0.02, 0.22, 3.15], [0, 0.17, 3.52]];
DAYS[8] = (t, lt) => {
  const m = CAST.mLinen, e = CAST.elena; NOSE.person = m;
  const S = SETS.bed, O = S.origin;
  // lying on his back: root rotated -90 deg about x puts the head toward -z, face up
  show(m, 'bed', -0.45, 0.67, -1.36 + m.legLen + 0.68 * m.s, 0, -Math.PI / 2);
  const P = m.stand(t);
  P.lShZ = 0.2; P.rShZ = -0.2; P.lElX = -0.2; P.rElX = -0.2;
  const sn = (t - T.snore0) % 1.25 / 1.25;
  const breathe = Math.sin(sn * Math.PI * 2);
  m.F.open = 0.25 + Math.max(0, breathe) * 0.35; m.F.squint = 1; m.F.smile = 0;
  P.headX = -0.15; P.lAnX = P.rAnX = 1.3;
  finish(m, t);
  const L = noseLen(t), Lfull = LEN(8);
  const pts = BED_PATH.map(([x, y, z]) => WV('bed', x, y + (z > 2.6 ? 0 : 1) * breathe * 0.02 * clamp(z + 1, 0, 3), z));
  NOSE.update(t, { L, pts, ptsFrac: clamp(L / Lfull, 0.2, 1), wob: growWob(t, 8) * 0.04 });
  // Elena: awake, deadpan, staring at the ceiling (and the nose)
  show(e, 'bed', 0.45, 0.66, -1.36 + e.legLen + 0.68 * e.s, 0, -Math.PI / 2);
  const E = e.stand(t);
  E.lShZ = 0.15; E.rShZ = -0.15; E.lAnX = E.rAnX = 1.3;
  if (e.skirt) e.skirt.visible = false;
  E.headY = -0.35 * ss(39.6, 40.3, t);
  e.F.smile = -0.1; e.F.squint = 0.45; e.F.browL = -0.3; e.F.browR = -0.3; e.F.lookY = 0.3; e.F.lookX = -0.5 * ss(39.6, 40.3, t);
  finish(e, t);
  // the duvet hides their legs
  S.duvet.visible = true;
  for (let i = 0; i < 4; i++) fx(t, T.snore0 + i * 1.25 + 0.3, 1.1, i % 2 ? 'zzz' : 'Zzz', NOSE.tip(new THREE.Vector3()).add(new THREE.Vector3(0.12, 0.25 + ramp(T.snore0 + i * 1.25, T.snore0 + i * 1.25 + 1.2, t) * 0.25, 0)), 'zz');
  fx(t, 40.9, 1.2, 'SNORK', W('bed', -0.55, 1.15, -1.2).clone(), 'small');
};

// ---- DAY 9: open plan — slide + fairy lights ----
const OPEN_PATH = [[0, 1.66, -0.6], [0, 1.5, 0.75], [0, 1.18, 2.05], [0, 0.88, 3.15], [0, 0.7, 3.85], [0, 0.67, 4.3]];
DAYS[9] = (t, lt) => {
  const m = CAST.mLinen, e = CAST.elena, leo = CAST.leo, mia = CAST.mia; NOSE.person = m;
  const S = SETS.open, O = S.origin;
  show(m, 'open', 0, 0, -1.78, 0);
  const P = m.stand(t);
  P.lShX = -0.5; P.rShX = -0.5; P.lElX = -0.9; P.rElX = -0.9; P.lShZ = 0.25; P.rShZ = -0.25;   // hands on the island
  m.F.smile = 0.75; m.F.browL = 0.4; m.F.browR = 0.4;
  finish(m, t);
  const L = noseLen(t);
  const kids = [[leo, T.slideLeo, T.plopLeo, 0], [mia, T.slideMia, T.plopMia, 1]];
  // the weight of a kid sags the nose a bit
  let sag = 0;
  const pts = OPEN_PATH.map(([x, y, z]) => WV('open', x, y, z));
  NOSE.update(t, { L, pts, ptsFrac: clamp(L / LEN(9), 0.3, 1), wob: growWob(t, 9) * 0.05 });
  look(m, NOSE.at(0.7, _b).x, _b.y, _b.z, 0.5);
  m.cross = 0.0; finish(m, t);
  NOSE.update(t, { L, pts, ptsFrac: clamp(L / LEN(9), 0.3, 1), wob: growWob(t, 9) * 0.05 });
  for (const [k, ts, tp, i] of kids) {
    const sofaSeat = WV('open', i ? 0.55 : -0.55, 0, S.sofaZ);
    let u;
    if (t < ts - 0.05) u = 0.36;
    else u = lerp(0.36, 0.95, Math.pow(ramp(ts, tp - 0.15, t), 1.6));
    if (t < tp - 0.1) {
      const p = NOSE.at(u, new THREE.Vector3()); const up = NOSE.upAt(u, new THREE.Vector3()); const dir = NOSE.dirAt(u, new THREE.Vector3());
      const r = NOSE.radAt(u);
      // astride, facing down the slope
      k.root.visible = true;
      k.root.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
      const P2 = k.stand(t);
      P2.hipY = 0;
      k.root.position.copy(p).addScaledVector(up, r * 0.9).add(new THREE.Vector3(0, -k.legLen - 0.02, 0));
      P2.lHipX = P2.rHipX = -1.25; P2.lHipZ = 0.55; P2.rHipZ = -0.55; P2.lKnX = P2.rKnX = 1.1;
      const slope = Math.asin(clamp(-dir.y, -1, 1));
      P2.torX = -slope * 0.6 - 0.1;
      const going = t > ts;
      P2.lShX = going ? -2.8 : -0.4; P2.rShX = going ? -2.8 : -0.4; P2.lShZ = going ? 0.4 : 0.3; P2.rShZ = going ? -0.4 : -0.3; P2.lElX = P2.rElX = -0.2;
      k.F.smile = 1; k.F.open = going ? 0.75 : 0.25; k.F.browL = k.F.browR = going ? 0.8 : 0.2;
      if (!going) { finish(k, t); reach(k, 1, p.clone().addScaledVector(up, r).add(new THREE.Vector3(0.08, 0, 0)), 0.9); reach(k, -1, p.clone().addScaledVector(up, r).add(new THREE.Vector3(-0.08, 0, 0)), 0.9); }
      finish(k, t);
      if (going && i === 0 && t > ts + 0.1) fx(t, ts + 0.1, 1.0, 'WHEEE!', p.clone().add(new THREE.Vector3(0.3, 0.75, 0)));
      if (going && i === 1 && t > ts + 0.1) fx(t, ts + 0.1, 0.9, 'wheee!', p.clone().add(new THREE.Vector3(-0.3, 0.7, 0)), 'small');
    } else {
      // plop onto the sofa and bounce
      const v = t - tp;
      const b = v > 0 ? Math.abs(Math.sin(v * 9)) * Math.exp(-v * 4) * 0.25 : 0.05;
      show(k, 'open', sofaSeat.x - O.x, 0, S.sofaZ - 0.05, Math.PI);
      const P2 = k.stand(t); k.sit(0.56 + b); P2.torX = -0.15;
      P2.lShX = -2.5 + v; P2.rShX = -2.5 + v; P2.lShX = Math.min(P2.lShX, -0.3); P2.rShX = Math.min(P2.rShX, -0.3);
      k.root.rotation.y = 0;   // facing back toward dad
      k.F.smile = 1; k.F.open = 0.5; k.F.squint = 0.6;
      finish(k, t);
      if (v > 0) fx(t, tp, 0.6, 'PLOP', sofaSeat.clone().add(new THREE.Vector3(0, 1.0, 0.0)), 'small');
    }
  }
  // Elena hanging fairy lights along the nose, walking down its left side
  const prog = lerp(0.35, 0.97, ramp(42.2, 46.6, t));
  NOSE.at(prog, _b);
  show(e, 'open', -0.55, 0, clamp(_b.z - O.z, -0.5, 3.6), Math.PI / 2 + 0.25);
  const E = e.stand(t);
  e.walk((_b.z - O.z) / 0.55 * Math.PI, 0.35);
  finish(e, t);
  NOSE.at(Math.min(prog + 0.03, 1), _c); NOSE.sideAt(prog, _d);
  reach(e, -1, _c.clone().addScaledVector(_d, NOSE.radAt(prog) * 1.1).add(new THREE.Vector3(0, 0.08, 0)), 1);
  look(e, _c.x, _c.y, _c.z, 0.8);
  e.F.smile = 0.85;
  finish(e, t);
  // bulbs: a spiral wrap from u=0.2 to the current progress
  const fb = S.fairy, cols = ['#ff5a5a', '#ffd23f', '#59e38c', '#5ab4ff', '#ff8af0', '#ffffff'];
  let n = 0;
  for (let i = 0; i < 120; i++) {
    const u = 0.15 + i / 119 * 0.83;
    if (u > prog) break;
    NOSE.at(u, _b); NOSE.upAt(u, _c); NOSE.sideAt(u, _d);
    const r = NOSE.radAt(u) * 1.06, a = u * NOSE.L * 9.5;
    _b.addScaledVector(_c, Math.cos(a) * r).addScaledVector(_d, Math.sin(a) * r).sub(O);
    const tw = 0.75 + 0.25 * Math.sin(t * 6 + i * 1.7);
    _m4.makeTranslation(_b.x, _b.y, _b.z); fb.setMatrixAt(n, _m4);
    _col.set(cols[i % cols.length]).multiplyScalar(1.4 * tw); fb.setColorAt(n, _col); n++;
  }
  fb.count = n; fb.instanceMatrix.needsUpdate = true; if (fb.instanceColor) fb.instanceColor.needsUpdate = true;
  fb.visible = n > 0;
};

// ---- DAY 10: the infinity pool ----
const POOL_PATH = [[0, 1.4, 3.3], [0, 1.08, 1.6], [0, 0.94, -0.3], [0, 0.86, -2.3], [0, 0.62, -4.25], [0, 0.26, -5.55], [0, 0.22, -6.02]];
const SEATS = [['elena', 1.75], ['leo', -0.35], ['mia', -2.35]];
function day10(t, lt, coldOpen) {
  const m = CAST.mLinen; NOSE.person = m;
  const S = SETS.pool, O = S.origin;
  show(m, 'pool', 0, 0, 5.08, Math.PI);
  const P = m.stand(t);
  m.F.smile = 0.9; m.F.squint = 0.2; P.headX = 0.05;
  const seated = coldOpen || t > 49.3;
  finish(m, t);
  const L = coldOpen ? LEN(10) : noseLen(t);
  // the family's weight sags the middle a little, with a gentle bob as the kids kick
  const bob = Math.sin(t * 2.2) * 0.015 * (seated ? 1 : 0);
  const pts = POOL_PATH.map(([x, y, z]) => WV('pool', x, y - (seated ? 0.04 * Math.exp(-Math.pow((z + 0.4) / 2.5, 2)) : 0) + bob * Math.exp(-Math.pow((z + 0.4) / 3, 2)), z));
  const frac = coldOpen ? 1 : clamp(L / LEN(10), 0.2, 1);
  NOSE.update(t, { L, pts, ptsFrac: frac, wob: coldOpen ? 0 : growWob(t, 10) * 0.08 });
  if (!seated) {
    // before the cut: the family watches from the side deck, cheering as it lands
    const ch = ss(T.tipLand - 0.2, T.tipLand + 0.2, t);
    [['elena', 2.75, 2.6], ['leo', 2.6, 1.6], ['mia', 2.85, 0.9]].forEach(([n, x, z], i) => {
      const k = CAST[n]; show(k, 'pool', x, 0, z, -Math.PI / 2 - 0.4);
      const Pk = k.stand(t);
      look(k, O.x, 0.8, O.z - 3.0 * ss(47.4, 47.9, t), 0.9);
      k.F.open = 0.4 * ch; k.F.smile = 0.6 + 0.4 * ch; k.F.browL = k.F.browR = 0.5 * ch;
      if (ch > 0 && n !== 'elena') { Pk.lShX = -2.8 * ch; Pk.rShX = -2.8 * ch; k.root.position.y += Math.abs(Math.sin(t * 8 + i)) * 0.12 * ch; }
      if (n === 'elena') { finish(k, t); headPos(k, _c); _c.z += 0.0; _c.x -= 0.1; _c.y -= 0.1; reach(k, 1, _c, ch * 0.8); k.F.open = 0.3 * ch; }
      finish(k, t);
    });
    return;
  }
  SEATS.forEach(([n, z], i) => {
    const k = CAST[n];
    // nose height at this z
    let best = 0, bd = 1e9;
    for (let j = 0; j <= 110; j++) { const d = Math.abs(NOSE.P[j].z - (O.z + z)); if (d < bd) { bd = d; best = j; } }
    const p = NOSE.P[best], r = NOSE.Rad[best];
    k.root.visible = true; k.root.rotation.set(0, Math.PI / 2, 0);
    k.root.position.set(p.x - 0.04, 0, p.z);
    const Pk = k.stand(t);
    k.sit(p.y + r * 0.85 - O.y);
    Pk.lHipX = Pk.rHipX = -1.45; Pk.lKnX = 1.25 + Math.sin(t * 3.1 + i * 2) * 0.35 * (n === 'elena' ? 0.3 : 1); Pk.rKnX = 1.25 + Math.sin(t * 3.1 + i * 2 + 2.5) * 0.35 * (n === 'elena' ? 0.3 : 1);
    Pk.torX = 0.05; Pk.lShX = 0.2; Pk.rShX = 0.2; Pk.lShZ = 0.35; Pk.rShZ = -0.35; Pk.lElX = -0.4; Pk.rElX = -0.4;   // hands on the "bench"
    // everyone looking at the sunset, then turning to smile at dad
    const turnBack = ss(52.2, 53.0, t);
    look(k, O.x - 4, 2.0 + (n === 'mia' ? -0.3 : 0), O.z - 30, 1 - turnBack, 0.2);
    look(k, O.x, 1.75, O.z + 5.0, turnBack, 0.3);
    k.F.smile = 0.9; k.F.squint = 0.25;
    finish(k, t);
  });
  if (!coldOpen) fx(t, T.tipLand, 0.8, 'THWUMP', WV('pool', 0.0, 0.85, -5.7));
}
DAYS[10] = (t, lt) => day10(t, lt, false);

// =====================================================================
// SHOTS — set-local positions; a target may be a function of time
// =====================================================================
const tipTarget = (dx = 0, dy = 0, dz = 0) => () => NOSE.tip(new THREE.Vector3()).add(new THREE.Vector3(dx, dy, dz));
const noseAt = (u, dx = 0, dy = 0, dz = 0) => () => NOSE.at(u, new THREE.Vector3()).add(new THREE.Vector3(dx, dy, dz));
const SHOTS = [
  // COLD OPEN: Day 10 at the pool, title over it
  { t0: 0.0, t1: 2.2, set: 'pool', p0: [3.6, 1.35, 3.4], p1: [3.35, 1.3, 3.1], g0: [0, 1.0, -1.2], g1: [0, 0.95, -1.3], f0: 54, f1: 51, hand: 0.6 },
  // DAY 1 — the mirror: from the mirror's point of view, then profile
  { t0: 2.2, t1: 4.6, set: 'bath', p0: [0.02, 1.76, -2.06], p1: [0.02, 1.76, -1.98], g0: [0, 1.68, -1.1], g1: [0, 1.7, -1.1], f0: 50, f1: 40, hand: 0.4 },
  { t0: 4.6, t1: 7.2, set: 'bath', p0: [1.05, 1.68, -1.85], p1: [0.98, 1.68, -1.8], g0: [0, 1.66, -1.3], g1: [0, 1.66, -1.3], f0: 44, f1: 40, hand: 0.6 },
  // DAY 2 — espresso
  { t0: 7.2, t1: 8.9, set: 'kitchen', p0: [-1.35, 1.7, 2.45], p1: [-1.25, 1.68, 2.3], g0: [0.05, 1.4, -0.2], g1: [0.05, 1.4, -0.2], f0: 46, f1: 43, hand: 0.8 },
  { t0: 8.9, t1: 10.6, set: 'kitchen', p0: [-0.62, 1.62, -0.05], p1: [-0.58, 1.6, 0.0], g0: tipTarget(0, 0.06, 0.12), g1: tipTarget(0, 0.06, 0.12), f0: 38, f1: 34, hand: 0.5 },
  { t0: 10.6, t1: 12.2, set: 'kitchen', p0: [0.42, 1.68, 1.55], p1: [0.4, 1.66, 1.45], g0: [0.12, 1.55, -0.9], g1: [0.12, 1.55, -0.9], f0: 34, f1: 31, hand: 0.6 },
  // DAY 3 — the kids, the sunglasses
  { t0: 12.2, t1: 14.0, set: 'hall', p0: [0.15, 1.15, 3.3], p1: [0.12, 1.15, 3.1], g0: [0, 1.25, -1.4], g1: [0, 1.3, -1.4], f0: 48, f1: 46, hand: 0.8 },
  { t0: 14.0, t1: 15.6, set: 'hall', p0: [0.3, 1.72, -0.35], p1: [0.28, 1.72, -0.42], g0: [0.08, 1.7, -1.5], g1: [0.08, 1.7, -1.5], f0: 38, f1: 35, hand: 0.6 },
  { t0: 15.6, t1: 17.2, set: 'hall', p0: [-0.15, 1.05, -0.45], p1: [-0.1, 1.0, -0.35], g0: [0.05, 0.75, 1.0], g1: [0.05, 0.72, 1.0], f0: 46, f1: 44, hand: 0.9 },
  // DAY 4 — boop, side kiss, tape measure
  { t0: 17.2, t1: 19.4, set: 'living', p0: [0.2, 1.55, 3.1], p1: [0.2, 1.55, 2.9], g0: [0.2, 1.45, 0.3], g1: [0.2, 1.45, 0.3], f0: 42, f1: 40, hand: 0.6 },
  { t0: 19.4, t1: 20.8, set: 'living', p0: [1.45, 1.7, 0.55], p1: [1.38, 1.7, 0.55], g0: [-0.3, 1.72, 0.42], g1: [-0.3, 1.72, 0.42], f0: 36, f1: 33, hand: 0.6 },
  { t0: 20.8, t1: 22.2, set: 'living', p0: [1.15, 1.8, 1.55], p1: [1.08, 1.78, 1.45], g0: [-0.05, 1.6, -0.05], g1: [-0.05, 1.6, -0.05], f0: 44, f1: 41, hand: 0.6 },
  // DAY 5 — the frame, the doorway
  { t0: 22.2, t1: 23.6, set: 'hallway', p0: [-0.1, 1.62, 0.6], p1: [-0.1, 1.62, 0.3], g0: [0.45, 1.6, -2.6], g1: [0.45, 1.6, -2.4], f0: 44, f1: 42, hand: 0.8 },
  { t0: 23.6, t1: 25.0, set: 'hallway', p0: [-0.75, 1.62, -0.9], p1: [-0.72, 1.62, -0.95], g0: [0.75, 1.55, -2.15], g1: [0.75, 1.55, -2.15], f0: 42, f1: 40, hand: 0.7 },
  { t0: 25.0, t1: 27.2, set: 'hallway', p0: [1.25, 1.35, 4.9], p1: [1.15, 1.35, 4.8], g0: [0, 1.55, 2.9], g1: [0, 1.6, 3.1], f0: 44, f1: 42, hand: 0.6 },
  // DAY 6 — dinner
  { t0: 27.2, t1: 29.3, set: 'dining', p0: [1.95, 1.95, 2.1], p1: [1.85, 1.9, 1.95], g0: [-0.25, 0.95, 0.0], g1: [-0.25, 0.95, 0.0], f0: 46, f1: 44, hand: 0.7 },
  { t0: 29.3, t1: 30.8, set: 'dining', p0: [0.05, 1.4, -1.95], p1: [0.05, 1.38, -1.85], g0: [0.05, 1.0, 0.3], g1: [0.05, 1.0, 0.3], f0: 42, f1: 40, hand: 0.7 },
  { t0: 30.8, t1: 32.2, set: 'dining', p0: [0.25, 1.3, 1.05], p1: [0.22, 1.28, 1.0], g0: [-0.45, 1.2, 0.2], g1: [-0.45, 1.2, 0.2], f0: 44, f1: 41, hand: 0.6 },
  // DAY 7 — stairs, chandelier, Elena
  { t0: 32.2, t1: 34.1, set: 'stairs', p0: [1.5, 1.25, 4.7], p1: [1.55, 1.3, 4.4], g0: [1.2, 3.3, -0.4], g1: [1.2, 3.4, -0.4], f0: 54, f1: 52, hand: 0.7 },
  { t0: 34.1, t1: 35.7, set: 'stairs', p0: [-0.3, 3.55, 2.75], p1: [-0.25, 3.5, 2.65], g0: [0.95, 3.9, 0.9], g1: [0.95, 3.6, 0.9], f0: 44, f1: 42, hand: 0.7 },
  { t0: 35.7, t1: 37.2, set: 'stairs', p0: [1.35, 1.45, 0.75], p1: [1.3, 1.43, 0.8], g0: [0.3, 1.25, 2.55], g1: [0.3, 1.22, 2.55], f0: 56, f1: 54, hand: 0.8 },
  // DAY 8 — bedroom
  { t0: 37.2, t1: 39.4, set: 'bed', p0: [1.9, 1.75, 2.35], p1: [1.8, 1.7, 2.25], g0: [-0.25, 0.85, -0.9], g1: [-0.25, 0.85, -0.9], f0: 58, f1: 55, hand: 0.4 },
  { t0: 39.4, t1: 40.8, set: 'bed', p0: [1.25, 0.75, 4.25], p1: [1.15, 0.72, 4.15], g0: [0, 0.3, 3.3], g1: [0, 0.3, 3.3], f0: 40, f1: 38, hand: 0.4 },
  { t0: 40.8, t1: 42.2, set: 'bed', p0: [0.05, 2.25, -0.35], p1: [0.05, 2.2, -0.42], g0: [0.0, 0.72, -1.4], g1: [0.0, 0.72, -1.4], f0: 52, f1: 49, hand: 0.4 },
  // DAY 9 — open plan
  { t0: 42.2, t1: 44.4, set: 'open', p0: [1.75, 2.45, 6.05], p1: [1.65, 2.4, 5.9], g0: [-0.15, 1.05, 1.3], g1: [-0.15, 1.05, 1.3], f0: 52, f1: 50, hand: 0.7 },
  { t0: 44.4, t1: 45.8, set: 'open', p0: [1.75, 1.3, 2.0], p1: [1.7, 1.25, 2.1], g0: [0.0, 0.8, 3.7], g1: [0.0, 0.78, 3.8], f0: 52, f1: 50, hand: 0.8 },
  { t0: 45.8, t1: 47.2, set: 'open', p0: [0.75, 1.72, -0.55], p1: [0.72, 1.72, -0.62], g0: [-0.05, 1.68, -1.6], g1: [-0.05, 1.68, -1.6], f0: 44, f1: 41, hand: 0.6 },
  // DAY 10 — the pool
  { t0: 47.2, t1: 49.4, set: 'pool', p0: [0.55, 2.75, 7.7], p1: [0.5, 2.7, 7.45], g0: [0, 0.45, -2.6], g1: [0, 0.4, -3.0], f0: 52, f1: 50, hand: 0.6 },
  { t0: 49.4, t1: 51.6, set: 'pool', p0: [3.9, 1.45, 3.7], p1: [3.75, 1.42, 3.5], g0: [0, 0.95, -0.9], g1: [0, 0.95, -1.0], f0: 54, f1: 52, hand: 0.6 },
  { t0: 51.6, t1: 61.0, set: 'pool', p0: [1.5, 2.15, 7.3], p1: [2.4, 8.0, 14.0], g0: [0, 0.85, -1.5], g1: [0, -0.6, -6.5], f0: 52, f1: 50, hand: 0.35, ease: 'slow' },
];

function storyUpdate(t) {
  FXW.length = 0;
  hideAll();
  for (const k in SETS) {
    const s = SETS[k];
    if (s.tape) { s.tape.visible = false; s.tcase.visible = false; }
    if (s.napkin) s.napkin.visible = false;
    if (s.fairy) s.fairy.visible = false;
    if (s.glasses) s.glasses.position.set(-2.9, 0.9, -0.9);
    if (s.cup) { s.cup.position.set(0.12, 0.965, 0.34); s.cup.rotation.set(0, 0.6, 0); }
  }
  for (const k of ['mShirt', 'mSuit', 'mLinen', 'elena', 'leo', 'mia']) { CAST[k].cross = 0; if (CAST[k].skirt) CAST[k].skirt.visible = true; }
  if (t < COLD_OPEN) { day10(t, 0, true); return; }
  const d = dayAt(t);
  DAYS[d](t, t - DAY_T(d));
}
function currentShot(t) {
  let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  return SHOTS[i];
}
