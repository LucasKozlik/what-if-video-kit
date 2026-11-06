'use strict';
// =====================================================================
// STORY — "What if you could see how much money everyone has?"
// Pure function of film time: update(t) poses the cast, moves props and
// lists the floating money tags for the HUD to draw.
// =====================================================================

const CAST = {};
let DOG;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _m4 = new THREE.Matrix4();

function buildCast(scene) {
  const P = (o) => new Person(scene, Object.assign({ headScale: 1.25, brow: '#2a1a12', shoes: '#2a2420', lip: '#8e4a3c' }, o));
  CAST.sam = P({ name: 'sam', h: 1.78, skin: '#d2a27c', hair: '#3a2618', hairStyle: 'tousled', shirt: '#3f8a63', sleeve: '#3f8a63', forearm: '#d2a27c', pants: '#34507a', seed: 1 });
  CAST.priya = P({ name: 'priya', h: 1.66, skin: '#b9805a', hair: '#1c1412', hairStyle: 'long', shirt: '#c23b4b', sleeve: '#b9805a', forearm: '#b9805a', pants: '#c23b4b', legs: '#b9805a', shin: '#b9805a', dress: '#c23b4b', shoes: '#c9a461', blush: true, lip: '#a02a3a', seed: 2 });
  CAST.rose = P({ name: 'rose', h: 1.56, skin: '#e9c3a6', hair: '#d8d4cf', brow: '#bdb6ae', hairStyle: 'bun', shirt: '#8a5a9a', sleeve: '#8a5a9a', pants: '#5a4a6a', dress: '#5a4a6a', legs: '#e9c3a6', shin: '#e9c3a6', glasses: true, blush: true, seed: 5 });
  CAST.suit = P({ name: 'suit', h: 1.84, skin: '#e0b08c', hair: '#4a3020', hairStyle: 'short', shirt: '#3a3f4a', sleeve: '#3a3f4a', pants: '#3a3f4a', jacket: true, tie: '#c9a461', seed: 6 });
  CAST.hoodie = P({ name: 'hoodie', h: 1.74, skin: '#c99671', hair: '#141010', hairStyle: 'tousled', shirt: '#8a8f96', sleeve: '#8a8f96', forearm: '#8a8f96', pants: '#26282c', hood: '#7c8188', headphones: true, shoes: '#f0f0f0', seed: 7 });
  CAST.barista = P({ name: 'barista', h: 1.7, skin: '#f0c8a8', hair: '#c46a2e', hairStyle: 'short', shirt: '#26262a', sleeve: '#26262a', forearm: '#f0c8a8', pants: '#26262a', dress: '#8a5a32', seed: 8 });
  CAST.influencer = P({ name: 'influencer', h: 1.7, skin: '#efc9a9', hair: '#e2c374', hairStyle: 'long', shirt: '#f4f4f4', sleeve: '#efc9a9', forearm: '#efc9a9', pants: '#f4f4f4', legs: '#efc9a9', shin: '#efc9a9', dress: '#f4f4f4', glasses: 'sun', lip: '#d0506a', seed: 9 });
  CAST.billionaire = P({ name: 'billionaire', h: 1.8, skin: '#e8b996', hair: '#9a9a9a', hairStyle: 'short', shirt: '#151518', sleeve: '#151518', pants: '#151518', jacket: true, tie: '#c0c4c8', glasses: 'sun', seed: 10 });
  CAST.g1 = P({ name: 'g1', h: 1.92, skin: '#7a5236', hair: '#111', hairStyle: 'short', shirt: '#101012', sleeve: '#101012', pants: '#101012', jacket: true, tie: '#101012', glasses: 'sun', seed: 11 });
  CAST.g2 = P({ name: 'g2', h: 1.9, skin: '#e0b08c', hair: '#111', hairStyle: 'short', shirt: '#101012', sleeve: '#101012', pants: '#101012', jacket: true, tie: '#101012', glasses: 'sun', seed: 12 });
  const ex = [['#e07b39', '#2c3e50', '#5a3a22', 'short', 1.76], ['#5b8bd6', '#3b3b3b', '#1d1d1d', 'long', 1.64], ['#e9d36b', '#6b4b8a', '#8a5a2a', 'tousled', 1.7], ['#c45a8a', '#2f4f3f', '#2a1a10', 'pigtails', 1.6]];
  ex.forEach(([sh, pa, hr, hs, h], i) => { CAST['e' + i] = P({ name: 'e' + i, h, skin: ['#e0b08c', '#8a5a3c', '#f0c8a8', '#c99671'][i], hair: hr, hairStyle: hs, shirt: sh, sleeve: sh, pants: pa, dress: hs === 'long' || hs === 'pigtails' ? pa : undefined, legs: hs === 'long' || hs === 'pigtails' ? '#c99671' : undefined, seed: 20 + i }); });
  DOG = new Dog(scene, '#d9a35a');
  // props
  CAST.cup = new THREE.Group();
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 14), stdMat('#ffffff', { roughness: 0.6 })); cm.position.y = 0.06; CAST.cup.add(cm);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.042, 0.05, 14), stdMat('#9a6a3a')); sl.position.y = 0.06; CAST.cup.add(sl);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.015, 14), stdMat('#222')); lid.position.y = 0.125; CAST.cup.add(lid);
  scene.add(CAST.cup);
  CAST.phone = boxm(0.075, 0.15, 0.01, '#15151a'); scene.add(CAST.phone);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.13), new THREE.MeshBasicMaterial({ color: '#7fd1ff' })); scr.position.z = 0.006; CAST.phone.add(scr); CAST.phoneScr = scr;
  CAST.bill = boxm(0.12, 0.02, 0.24, '#1a1a1a'); scene.add(CAST.bill);
  CAST.card = boxm(0.085, 0.004, 0.054, '#d8b24a'); scene.add(CAST.card);
  CAST.laptop = new THREE.Group(); box(CAST.laptop, 0.34, 0.015, 0.24, M.chrome, 0, 0, 0); const scrn = box(CAST.laptop, 0.34, 0.22, 0.01, M.black, 0, 0.11, -0.12); scrn.rotation.x = -0.25; scene.add(CAST.laptop);
  // knitting: yarn ball, needles, a growing scarf
  CAST.knit = new THREE.Group();
  const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), stdMat('#d9465a', { roughness: 1 })); yarn.position.set(0.25, -0.12, 0.05); CAST.knit.add(yarn);
  for (const sd of [1, -1]) { const nd = cyl(CAST.knit, 0.005, 0.005, 0.3, M.chrome, sd * 0.05, 0, 0, 6); nd.rotation.z = sd * 0.9; }
  CAST.scarf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.015), stdMat('#d9465a', { roughness: 1 })); CAST.scarf.position.set(0, -0.15, 0.02); CAST.knit.add(CAST.scarf);
  scene.add(CAST.knit);
  CAST.drinks = [0, 1, 2, 3].map(() => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, roughness: 0.1 })); scene.add(d); return d; });
}

// ---------- helpers ----------
const W = (set, x, y, z) => _a.set(SETS[set].origin.x + x, SETS[set].origin.y + y, SETS[set].origin.z + z);
const WV = (set, x, y, z) => new THREE.Vector3(SETS[set].origin.x + x, SETS[set].origin.y + y, SETS[set].origin.z + z);
function show(p, set, x, y, z, heading) {
  p.root.visible = true; const o = SETS[set].origin;
  p.root.position.set(o.x + x, o.y + y, o.z + z); p.root.rotation.set(0, heading, 0); p.root.rotation.order = 'YXZ';
}
const ss = (a, b, x) => smooth(a, b, x);
const ramp = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function headPos(p, out) {
  const s = p.s;
  return out.set(0, p.legLen + p.P.hipY + 0.05 * s + 0.5 * s + 0.09 * s + p.R * 0.95, 0).applyMatrix4(_m4.makeRotationFromEuler(p.root.rotation)).add(p.root.position);
}
function look(p, tx, ty, tz, k = 1, torso = 0.25) {
  const h = headPos(p, _d);
  const dx = tx - h.x, dz = tz - h.z, dy = ty - h.y;
  const yaw = clamp(wrapA(Math.atan2(dx, dz) - p.root.rotation.y), -1.6, 1.6);
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
  p.P.headY += yaw * (1 - torso) * k; p.P.torY += yaw * torso * k;
  p.P.headX += clamp(pitch, -0.8, 0.9) * k;
  p.F.lookX = clamp(yaw * 0.6, -1, 1) * k * 0.6; p.F.lookY = clamp(-pitch, -1, 1) * k * 0.5;
}
const lookP = (p, q, k = 1, torso = 0.25) => { headPos(q, _b); look(p, _b.x, _b.y + 0.05, _b.z, k, torso); };
function reach(p, side, target, k = 1) {
  if (k <= 0.001) return;
  const P = p.P, sh = side > 0 ? p.lSh : p.rSh, el = side > 0 ? p.lEl : p.rEl, hand = side > 0 ? p.lHand : p.rHand;
  const kx = side > 0 ? 'lShX' : 'rShX', kz = side > 0 ? 'lShZ' : 'rShZ', ke = side > 0 ? 'lElX' : 'rElX';
  p.apply(0); p.root.updateMatrixWorld(true);
  const x0 = [P[kx], P[kz], P[ke]], x = x0.slice();
  const lim = [[-3.1, 1.0], side > 0 ? [-0.4, 1.6] : [-1.6, 0.4], [-2.6, 0]];
  const err = () => { sh.rotation.x = x[0]; sh.rotation.z = x[1]; el.rotation.x = x[2]; sh.updateMatrixWorld(true); return hand.getWorldPosition(_c).distanceToSquared(target); };
  let best = err(), step = 0.5;
  for (let it = 0; it < 26; it++) { for (let j = 0; j < 3; j++) for (const sg of [1, -1]) { const old = x[j]; x[j] = clamp(old + sg * step, lim[j][0], lim[j][1]); const e = err(); if (e < best) best = e; else x[j] = old; } step *= 0.72; }
  P[kx] = lerp(x0[0], x[0], k); P[kz] = lerp(x0[1], x[1], k); P[ke] = lerp(x0[2], x[2], k);
}
const finish = (p, t) => p.apply(t);
const ALL = ['sam', 'priya', 'rose', 'suit', 'hoodie', 'barista', 'influencer', 'billionaire', 'g1', 'g2', 'e0', 'e1', 'e2', 'e3'];
function hideAll() {
  for (const k of ALL) { CAST[k].root.visible = false; CAST[k].cross = 0; if (CAST[k].skirt) CAST[k].skirt.visible = true; }
  DOG.root.visible = false;
  for (const k of ['cup', 'phone', 'bill', 'card', 'laptop', 'knit']) CAST[k].visible = false;
  CAST.drinks.forEach(d => d.visible = false);
  if (SETS.street && SETS.street.hotdog) SETS.street.hotdog.visible = false;
  if (SETS.open && SETS.open.fairy) SETS.open.fairy.visible = false;
  if (SETS.living && SETS.living.tape) { SETS.living.tape.visible = false; SETS.living.tcase.visible = false; }
  if (SETS.dining && SETS.dining.napkin) SETS.dining.napkin.visible = false;
  if (SETS.hall && SETS.hall.glasses) SETS.hall.glasses.visible = false;
  if (SETS.kitchen && SETS.kitchen.cup) SETS.kitchen.cup.visible = false;
}
function holdIn(obj, p, side, off = [0, 0, 0]) {
  obj.visible = true; (side > 0 ? p.lHand : p.rHand).getWorldPosition(obj.position); obj.position.x += off[0]; obj.position.y += off[1]; obj.position.z += off[2];
}

// ---------- money tags + FX words (drawn by the HUD) ----------
const TAGS = [], FXW = [];
function fmtMoney(v, cents) {
  const neg = v < 0, a = Math.abs(v);
  const s = cents ? a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(a).toLocaleString('en-US');
  return (neg ? '−$' : '$') + s;
}
function tag(p, value, t, t0, opts = {}) {
  const a = (opts.a ?? 1) * ss(t0, t0 + 0.35, t);
  if (a <= 0.01 || !p.root.visible) return;
  headPos(p, _b); _b.y += p.R * 1.25 + 0.2;
  TAGS.push({ p: _b.clone(), v: value, text: opts.text || fmtMoney(value, opts.cents), sub: opts.sub || '', cls: (value < 0 ? 'neg ' : '') + (opts.cls || ''), a, age: t - t0, big: opts.big || 1, id: p.o.name, flash: opts.flash });
}
function fx(t, t0, dur, text, pos, cls = '') { if (t < t0 || t > t0 + dur) return; FXW.push({ text, p: pos.clone(), a: (t - t0) / dur, cls, age: t - t0 }); }

// =====================================================================
// Scenes
// =====================================================================
const SC = {};

// --- cold open + billionaire: the street with a crowd ---
function streetCrowd(t, t0, coldOpen) {
  const bx = coldOpen ? lerp(18.5, 17.2, t / 2.2) : lerp(24, 13.5, ramp(T.billionaireIn, 42.4, t));
  const walkPh = bx / 0.7 * Math.PI * 2;
  const B = CAST.billionaire; show(B, 'street', bx, 0.15, 2.4, -Math.PI / 2);
  B.stand(t); B.walk(walkPh, 0.8); B.F.smile = 0.25; B.F.browL = B.F.browR = -0.2; finish(B, t);
  const guards = [[CAST.g1, 0.7, 1.75], [CAST.g2, 0.75, 2.95]];
  for (const [g, dx, z] of guards) { show(g, 'street', bx + dx, 0.15, z, -Math.PI / 2); g.stand(t); g.walk(walkPh + 1, 0.8); g.F.smile = -0.2; g.F.browL = g.F.browR = -0.5; finish(g, t); }
  // phone up: the crowd films him
  const crowd = [[CAST.e0, 16.3, 4.6, 2.6], [CAST.e1, 13.0, 1.0, 2.2], [CAST.e2, 19.0, 3.9, -2.6], [CAST.e3, 12.2, 1.3, 1.6]];
  crowd.forEach(([e, x, z, h], i) => {
    show(e, 'street', x, 0.15, z, h); e.stand(t);
    headPos(B, _c); look(e, _c.x, _c.y, _c.z, 1, 0.5);
    const film = coldOpen ? 1 : ss(T.gasp + i * 0.25, T.gasp + 0.5 + i * 0.25, t);
    e.F.open = film * 0.5; e.F.browL = e.F.browR = film * 0.8;
    finish(e, t);
    if (film > 0.05 && i % 2 === 0) { headPos(e, _d); _d.y -= 0.1; _d.addScaledVector(_c.clone().sub(_d).normalize(), 0.3); reach(e, -1, _d, film); finish(e, t); }
    tag(e, [27410, -3120, 412900, 8.2][i], t, coldOpen ? 0 : t0 + 0.6 + i * 0.15, { cents: i === 3 });
  });
  tag(B, billionaireValue(t), t, coldOpen ? 0 : T.billionaireIn, { cls: 'huge', sub: '▲ +$634 every second', big: 1.6 });
  tag(CAST.g1, 96400, t, coldOpen ? 0 : T.billionaireIn + 0.8, { a: 0.9 });
  tag(CAST.g2, 152300, t, coldOpen ? 0 : T.billionaireIn + 0.9, { a: 0.9 });
}
SC.open = t => { streetCrowd(t, 0, true); };

SC.billionaire = (t, lt) => {
  streetCrowd(t, sceneStart('billionaire'), false);
  const s = CAST.sam; show(s, 'street', 14.6, 0.15, 4.1, Math.PI / 2 + 0.3);
  s.stand(t); headPos(CAST.billionaire, _c); look(s, _c.x, _c.y + 0.5, _c.z, 1, 0.4);
  const shock = ss(T.gasp, T.gasp + 0.4, t);
  s.F.open = shock * 0.7; s.F.browL = s.F.browR = shock; s.F.smile = lerp(0.3, -0.1, shock);
  finish(s, t);
  tag(s, samBalance(t), t, sceneStart('billionaire') + 0.3, { cents: true, cls: 'sam' });
  fx(t, T.gasp, 1.0, 'WHOA', WV('street', 13.0, 2.3, 3.3), 'small');
};

// --- wake: the mirror ---
SC.wake = (t, lt) => {
  const s = CAST.sam; show(s, 'bath', 0, 0, -1.2, Math.PI);
  const P = s.stand(t), F = s.F;
  P.torX = 0.1;
  // groggy -> notices the number -> swats at it
  F.squint = 0.7 * (1 - ss(T.tagsAppear + 0.2, T.tagsAppear + 0.5, t));
  const notice = ss(T.tagsAppear + 0.3, T.tagsAppear + 0.6, t);
  F.browL = F.browR = notice * 0.9; F.open = notice * 0.35 * (1 - ss(T.swat - 0.3, T.swat, t));
  P.headX = -notice * 0.25;   // looking up at it
  F.lookY = notice * 0.9;
  const swat = ss(T.swat - 0.35, T.swat, t) * (1 - ss(T.swat + 0.5, T.swat + 0.9, t));
  finish(s, t);
  if (swat > 0) { headPos(s, _b); _b.y += 0.35 + Math.sin(t * 20) * 0.04; _b.x += Math.sin(t * 14) * 0.12; reach(s, -1, _b, swat); finish(s, t); }
  const after = ss(T.swat + 0.9, T.swat + 1.4, t);
  F.smile = lerp(0.3, 0.6, after); P.lShZ += after * 0.25; P.rShZ -= after * 0.25;  // shrug
  finish(s, t);
  const wob = t > T.swat ? Math.exp(-(t - T.swat) * 4) * Math.sin((t - T.swat) * 22) * 0.06 : 0;
  tag(s, samBalance(t), t, T.tagsAppear, { cents: true, cls: 'sam' });
  if (TAGS.length) { const tg = TAGS[TAGS.length - 1]; tg.p.x += wob; tg.p.y += Math.abs(wob); tg.rot = wob * 2.5; }
  fx(t, T.tagsAppear + 0.4, 1.0, '?!', WV('bath', -0.3, 2.05, -1.25), 'small');
};

// --- cafe: coffee, the suit in debt, the hoodie millionaire ---
SC.cafe = (t, lt) => {
  const t0 = sceneStart('cafe');
  const s = CAST.sam, b = CAST.barista, su = CAST.suit, h = CAST.hoodie;
  // Sam: order -> take the cup -> turn to look at the suit -> at the hoodie
  const turn = ss(10.6, 11.0, t), turn2 = ss(12.9, 13.3, t);
  show(s, 'open', 0.1, 0, -0.15, Math.PI + turn * 0.9 + turn2 * 1.4);
  const P = s.stand(t);
  finish(s, t);
  if (t < T.coffee + 0.3) { reach(s, -1, W('open', 0.15, 1.05, -0.62).clone(), ss(T.coffee - 0.5, T.coffee, t)); }
  else { P.rShX = -0.9; P.rElX = -1.4; P.rShZ = -0.15; }
  if (turn > 0.5 && turn2 < 0.5) lookP(s, su, 1);
  if (turn2 > 0.5) look(s, ...WV('open', -0.6, 1.0, 4.1).toArray(), 1, 0.3);
  s.F.smile = 0.5;
  const debt = ss(T.suitReveal, T.suitReveal + 0.3, t) * (1 - turn2); s.F.browTilt = debt * 0.6; s.F.open = debt * 0.2;
  const rich = ss(T.hoodieReveal, T.hoodieReveal + 0.3, t); s.F.open = Math.max(s.F.open, rich * 0.7); s.F.browL = s.F.browR = rich;
  finish(s, t);
  if (t >= T.coffee) { holdIn(CAST.cup, s, -1, [0, -0.06, 0]); }
  else { CAST.cup.visible = t > T.coffee - 1.2; CAST.cup.position.copy(W('open', 0.15, 0.95, -0.62)); }
  tag(s, samBalance(t), t, t0 + 0.2, { cents: true, cls: 'sam' });
  // barista behind the counter
  show(b, 'open', 0.1, 0, -1.75, 0); b.stand(t); lookP(b, s, 0.8); b.F.smile = 0.7;
  finish(b, t);
  if (t < T.coffee + 0.2) reach(b, 1, W('open', 0.15, 1.05, -0.75).clone(), ss(T.coffee - 0.9, T.coffee - 0.4, t));
  finish(b, t);
  tag(b, 3112, t, t0 + 0.5);
  // the suit, waiting, checking his watch
  show(su, 'open', 1.3, 0, 0.45, Math.PI - 0.25); su.stand(t);
  su.P.lShX = -1.2; su.P.lElX = -1.7; su.P.lShZ = 0.3; su.P.headX = 0.35 * (1 - ss(T.suitReveal - 0.2, T.suitReveal + 0.2, t));
  su.F.smile = lerp(0.4, -0.3, ss(T.suitReveal, T.suitReveal + 0.3, t)); su.F.browTilt = ss(T.suitReveal, T.suitReveal + 0.3, t);
  if (t > T.suitReveal) lookP(su, s, 0.7);
  finish(su, t);
  tag(su, -48210, t, t0 + 0.7);
  // the hoodie on the sofa with a laptop
  show(h, 'open', -0.6, 0, 4.15, Math.PI); h.stand(t); h.sit(0.48);
  h.P.lShX = -0.8; h.P.rShX = -0.8; h.P.lElX = -0.9; h.P.rElX = -0.9; h.P.headX = 0.3; h.F.smile = 0.2;
  h.P.headY = Math.sin(t * 4.5) * 0.06; // nodding to music
  finish(h, t);
  CAST.laptop.visible = true; CAST.laptop.position.copy(W('open', -0.6, 0.72, 3.75)); CAST.laptop.rotation.y = Math.PI;
  tag(h, 2400000, t, t0 + 0.9);
  fx(t, T.coffee, 0.9, 'ka-ching', WV('open', 0.5, 1.55, -0.6), 'small');
  fx(t, T.suitReveal + 0.1, 0.9, 'oof', WV('open', 1.7, 2.2, 0.4), 'small');
};

// --- street: the borrowed sports car, the happiest dog, a hot dog ---
SC.street = (t, lt) => {
  const t0 = sceneStart('street');
  const s = CAST.sam, inf = CAST.influencer, own = CAST.e2;
  // Sam walks +x along the sidewalk, buys a hot dog on the way, stops at the car, then the dog
  const x = t < 17.2 ? lerp(-6.0, -1.0, ramp(15.2, 17.2, t)) : t < 18.6 ? lerp(-1.0, 1.6, ramp(17.2, 18.6, t)) : lerp(1.6, 3.9, ramp(18.6, 19.6, t));
  show(s, 'street', x, 0.15, 2.3, Math.PI / 2);
  const P = s.stand(t);
  const moving = (t < 19.6 && !(t > 16.1 && t < 16.7));
  if (moving) s.walk(x / 0.7 * Math.PI * 2, 0.85);
  if (t > 19.6) { s.sit(0.5 + 0.15); P.torX = 0.35; P.headX = 0.25; }   // crouch to pet the dog
  if (t > 17.4 && t < 18.8) { look(s, ...WV('street', 2.6, 1.6, 0.45).toArray(), 1, 0.4); s.F.browTilt = ss(T.carReveal, T.carReveal + 0.3, t) * 0.6; }
  if (t > 18.8 && t < 19.8) look(s, ...WV('street', 5.0, 0.6, 2.9).toArray(), 1, 0.3);
  s.F.smile = t > 19.4 ? 0.95 : 0.45; s.F.squint = t > 19.6 ? 0.5 : 0;
  finish(s, t);
  if (t > 16.2 && t < 19.6) { holdIn(SETS.street.hotdog, s, -1, [0, 0.02, 0]); SETS.street.hotdog.rotation.y = 0; }
  if (t > 19.6) { reach(s, -1, WV('street', 4.95, 0.75, 2.95), 1); finish(s, t); }
  tag(s, samBalance(t), t, t0 + 0.2, { cents: true, cls: 'sam' });
  // influencer posing by the car, phone up
  show(inf, 'street', 2.4, 0.15, 0.45, Math.PI * 0.95); inf.stand(t);
  inf.P.torZ = 0.08; inf.P.hipY -= 0.01; inf.F.smile = 0.9; inf.P.headZ = 0.15 + Math.sin(t * 1.3) * 0.05;
  const busted = ss(T.carReveal + 0.1, T.carReveal + 0.4, t) * (1 - ss(20.5, 21, t));
  finish(inf, t);
  headPos(inf, _d); _d.add(new THREE.Vector3(0.05, 0.12, -0.45));
  reach(inf, -1, _d, 1); inf.F.smile = lerp(0.95, -0.2, busted); inf.F.browL = inf.F.browR = busted * 0.7;
  finish(inf, t); holdIn(CAST.phone, inf, -1, [0, 0.05, 0]); CAST.phone.lookAt(headPos(inf, _c));
  tag(inf, -291400, t, t0 + 0.6, { sub: 'car: leased' });
  // the dog and its owner
  DOG.place(SETS.street.origin.x + 5.0, 0.15, SETS.street.origin.z + 2.95, -Math.PI / 2 + 0.3);
  DOG.pose(t, { sit: 1, wag: 1, bark: (t > T.bark && t < T.bark + 0.7) || (t > 21 && t < 21.3) });
  show(own, 'street', 5.6, 0.15, 3.5, -Math.PI / 2 - 0.4); own.stand(t); own.F.smile = 0.7; look(own, ...WV('street', 4.5, 0.8, 2.6).toArray(), 0.7); finish(own, t);
  tag(own, 61200, t, t0 + 1.2, { a: 0.85 });
  // the dog's tag: hand-made, since it isn't a Person
  { const a = ss(T.dogReveal, T.dogReveal + 0.35, t); if (a > 0.01) TAGS.push({ p: WV('street', 4.95, 1.05, 2.95), v: 0, text: '$0.00', sub: 'very happy', cls: 'dog', a, age: t - T.dogReveal, big: 1, id: 'dog' }); }
  fx(t, T.bark, 0.7, 'WOOF!', WV('street', 5.2, 1.3, 2.7));
  fx(t, T.carReveal + 0.05, 0.9, 'womp womp', WV('street', 2.0, 2.6, 0.2), 'small');
};

// --- date ---
SC.date = (t, lt) => {
  const t0 = sceneStart('date');
  const s = CAST.sam, p = CAST.priya;
  show(s, 'dining', -0.85, 0, 0.2, Math.PI / 2); const P = s.stand(t); s.sit(0.49);
  P.torX = 0.08; P.lShX = -0.6; P.lElX = -1.0; P.rShX = -0.6; P.rElX = -1.0;
  show(p, 'dining', 0.85, 0, 0.3, -Math.PI / 2); const Q = p.stand(t); p.sit(0.49);
  Q.torX = 0.08; Q.lShX = -0.6; Q.lElX = -1.1; Q.rShX = -0.6; Q.rElX = -1.1;
  finish(s, t); finish(p, t);
  // they both glance at each other's numbers
  const glance = Math.max(0, Math.sin((t - t0) * 1.6)) * (1 - ss(T.bill - 0.4, T.bill, t));
  headPos(p, _b); look(s, _b.x, _b.y + 0.35 * glance, _b.z, 1, 0.1);
  headPos(s, _b); look(p, _b.x, _b.y + 0.35 * (1 - glance) * (t < T.bill ? 1 : 0), _b.z, 1, 0.1);
  const gulp = ss(T.gulp - 0.1, T.gulp + 0.1, t) * (1 - ss(T.gulp + 0.6, T.gulp + 0.9, t));
  s.F.smile = lerp(0.5, -0.1, gulp); s.F.browTilt = gulp; s.F.open = gulp * 0.2; s.P.headX += gulp * 0.12;
  if (gulp > 0) { finish(s, t); headPos(s, _c); _c.y -= 0.22; _c.x += 0.1; reach(s, -1, _c, gulp); }   // tugs his collar
  p.F.smile = 0.8; p.F.browL = 0.3;
  // the bill arrives; both reach; she slides it over and pays
  const billOn = t > T.bill;
  const bx = lerp(0, 0.42, ss(T.priyaPays - 0.6, T.priyaPays - 0.2, t));
  if (billOn) { CAST.bill.visible = true; CAST.bill.position.copy(WV('dining', bx, 0.81, 0.25)); CAST.bill.rotation.set(0, 0.2, 0); }
  const reachS = ss(T.bill + 0.2, T.bill + 0.6, t) * (1 - ss(T.priyaPays - 0.6, T.priyaPays - 0.3, t));
  if (reachS > 0) { finish(s, t); reach(s, -1, WV('dining', -0.05, 0.86, 0.25), reachS); }
  const reachP = ss(T.priyaPays - 0.8, T.priyaPays - 0.5, t) * (1 - ss(T.priyaPays + 0.6, T.priyaPays + 1.0, t));
  if (reachP > 0) { finish(p, t); reach(p, 1, WV('dining', bx + 0.05, 0.87, 0.3), reachP); }
  if (t > T.priyaPays - 0.1 && t < T.priyaPays + 1.0) { finish(p, t); CAST.card.visible = true; CAST.card.position.copy(WV('dining', bx, 0.84, 0.3)); }
  const relief = ss(T.priyaPays + 0.2, T.priyaPays + 0.6, t);
  s.F.smile = Math.max(s.F.smile, relief * 0.9); s.F.squint = relief * 0.4; if (relief > 0) { s.P.torX -= relief * 0.1; s.P.headX -= relief * 0.15; }
  if (t > T.priyaPays) { p.F.smile = 1; p.P.headZ = 0.12; p.F.browL = 0.6; p.F.browR = 0.2; }
  finish(s, t); finish(p, t);
  tag(s, samBalance(t), t, t0 + 0.3, { cents: true, cls: 'sam' });
  tag(p, 3800000, t, t0 + 0.6);
  fx(t, T.gulp, 0.8, 'gulp', WV('dining', -0.7, 1.95, 0.15), 'small');
  fx(t, T.priyaPays, 0.9, 'I got it', WV('dining', 0.8, 1.95, 0.35), 'pink');
};

// --- grandma ---
SC.grandma = (t, lt) => {
  const t0 = sceneStart('grandma');
  const s = CAST.sam, r = CAST.rose;
  show(r, 'living', -0.5, 0, 2.35, Math.PI); const R_ = r.stand(t); r.sit(0.44);
  R_.torX = 0.12; R_.headX = 0.3 * (1 - ss(32.0, 32.5, t) * (1 - ss(33.8, 34.3, t)));
  const kn = Math.sin(t * 11);
  finish(r, t);
  const knitP = WV('living', -0.5, 0.82, 2.0);
  reach(r, 1, knitP.clone().add(new THREE.Vector3(0.07 + kn * 0.015, 0.02 * kn, 0)), 1);
  reach(r, -1, knitP.clone().add(new THREE.Vector3(-0.07 - kn * 0.015, -0.02 * kn, 0)), 1);
  r.F.smile = 0.55; r.F.squint = 0.25;
  if (t > 32.0 && t < 34.0) { lookP(r, s, 0.8, 0.1); r.F.smile = 0.9; r.F.browL = 0.5; }   // a little look up, a wink-ish smile
  finish(r, t);
  CAST.knit.visible = true; CAST.knit.position.copy(knitP); CAST.knit.rotation.set(0.3, Math.PI, 0);
  CAST.scarf.scale.y = 1 + (t - t0) * 0.12; CAST.scarf.position.y = -0.15 - (t - t0) * 0.018;
  tag(r, 11400000, t, t0 + 0.8, { sub: 'bought stock in 1974' });
  // Sam, holding a tray of tea, jaw on the floor
  show(s, 'living', 0.55, 0, 0.75, -0.35); const P = s.stand(t);
  lookP(s, r, 1, 0.2);
  const jaw = ss(T.jawDrop - 0.1, T.jawDrop + 0.15, t);
  s.F.open = jaw * 0.95; s.F.browL = s.F.browR = jaw * 1.1; s.F.smile = 0;
  P.headX -= jaw * 0.05; P.torX = -jaw * 0.08;
  P.lShX = -0.7; P.rShX = -0.7; P.lElX = -1.2; P.rElX = -1.2;
  finish(s, t);
  CAST.cup.visible = true; holdIn(CAST.cup, s, -1, [0, -0.05, 0]);
  if (t > T.jawDrop + 0.2) { const u = t - T.jawDrop - 0.2; CAST.cup.position.y = Math.max(SETS.living.origin.y + 0.0, CAST.cup.position.y - 4.9 * u * u); CAST.cup.rotation.z = Math.min(1.5, u * 6); }
  tag(s, samBalance(t), t, t0 + 0.3, { cents: true, cls: 'sam' });
  fx(t, T.jawDrop + 0.55, 0.6, 'clunk', WV('living', 0.5, 0.45, 0.85), 'small');
  fx(t, 33.5, 1.2, 'hee hee', WV('living', -0.9, 1.65, 2.2), 'small');
};

// --- payday ---
SC.payday = (t, lt) => {
  const t0 = sceneStart('payday');
  const s = CAST.sam;
  show(s, 'kitchen', 0, 0, 0.8, Math.PI);
  const P = s.stand(t);
  const dance = ss(T.payday + 0.2, T.payday + 0.4, t) * (1 - ss(T.rent - 0.25, T.rent, t));
  const slump = ss(T.rent + 0.15, T.rent + 0.6, t);
  finish(s, t);
  // phone in hand, looking at it
  headPos(s, _d); _d.add(new THREE.Vector3(0.05, -0.28, -0.32));
  if (dance < 0.5) { reach(s, -1, _d, 1 - dance * 2); P.headX = 0.3 * (1 - dance); }
  if (dance > 0) {
    const b = Math.sin(t * 12);
    P.lShX = lerp(P.lShX, -2.7, dance); P.rShX = lerp(P.rShX, -2.7 + b * 0.2, dance); P.lElX = lerp(P.lElX, -0.4, dance); P.rElX = lerp(P.rElX, -0.4, dance);
    P.lShZ = 0.3 * dance + b * 0.15 * dance; P.rShZ = -0.3 * dance + b * 0.15 * dance;
    P.torZ = b * 0.12 * dance; P.hipY = -Math.abs(b) * 0.06 * dance; P.headZ = -b * 0.1 * dance; P.lKnX = P.rKnX = Math.abs(b) * 0.25 * dance;
    s.F.smile = 1; s.F.open = 0.5; s.F.squint = 0.6;
  } else s.F.smile = 0.45;
  if (slump > 0) {
    P.torX = lerp(P.torX, 0.75, slump); P.headX = lerp(P.headX, 0.2, slump); P.lShX = lerp(P.lShX, -0.9, slump); P.rShX = lerp(P.rShX, -0.9, slump);
    P.lElX = lerp(P.lElX, -0.3, slump); P.rElX = lerp(P.rElX, -0.3, slump); P.hipY = -0.03 * slump;
    s.F.smile = lerp(s.F.smile, -0.6, slump); s.F.open = 0; s.F.squint = 0.3; s.F.browTilt = slump;
  }
  finish(s, t);
  holdIn(CAST.phone, s, dance > 0.5 ? 1 : -1, [0, 0.04, 0]); CAST.phone.lookAt(headPos(s, _c));
  CAST.phoneScr.material.color.set(t > T.rent ? '#ff8a8a' : t > T.payday ? '#9dffb0' : '#7fd1ff');
  tag(s, samBalance(t), t, t0 + 0.2, { cents: true, cls: 'sam', big: 1.25 });
  fx(t, T.payday + 0.1, 1.0, '+$2,150!', WV('kitchen', -0.6, 2.35, 0.7));
  fx(t, T.rent + 0.1, 1.1, 'RENT: −$1,600', WV('kitchen', 0.55, 2.25, 0.7), 'red');
};

// --- party at sunset: tags fade as nobody cares ---
SC.party = (t, lt) => {
  const t0 = sceneStart('party');
  const C0 = [2.75, 0.4];
  const ring = [['sam', 3.9], ['priya', 2.9], ['rose', 4.9], ['hoodie', 5.9], ['e1', 1.9], ['suit', 0.0]];
  const vals = { sam: samBalance(t), priya: 3800000, rose: 11400000, hoodie: 2400000, e1: -3120, suit: -48210 };
  ring.forEach(([n, a], i) => {
    const p = CAST[n], R0 = 1.0;
    const x = C0[0] + Math.cos(a) * R0, z = C0[1] + Math.sin(a) * R0;
    const hd = Math.atan2(C0[0] - x, C0[1] - z);
    show(p, 'pool', x, 0, z, hd);
    const Pp = p.stand(t);
    const lol = Math.max(0, Math.sin((t - t0) * 1.3 + i * 1.7));
    if (lol > 0.4) p.laugh(t, (lol - 0.4) * 1.4);
    else p.F.smile = 0.8;
    finish(p, t);
    if (i < 4) { holdIn(CAST.drinks[i], p, i % 2 ? 1 : -1, [0, 0, 0]); CAST.drinks[i].visible = true; }
    const fade = 1 - ss(T.fadeTags + i * 0.35, T.fadeTags + i * 0.35 + 0.3, t);
    tag(p, vals[n], t, t0 + 0.3 + i * 0.12, { cents: n === 'sam', cls: n === 'sam' ? 'sam' : '', a: fade });
  });
  DOG.place(SETS.pool.origin.x + 2.7, 0, SETS.pool.origin.z + 0.35, 0.8);
  DOG.pose(t, { sit: 0.0, wag: 1, walk: 0.0, bark: t > 50.4 && t < 50.8 });
  { const a = ss(t0 + 1.0, t0 + 1.3, t) * (1 - ss(T.fadeTags + 2.1, T.fadeTags + 2.4, t)); if (a > 0.01) TAGS.push({ p: WV('pool', 2.7, 0.95, 0.35), v: 0, text: '$0.00', sub: 'still very happy', cls: 'dog', a, age: t - t0, big: 0.85, id: 'dog' }); }
};

// =====================================================================
// SHOTS (set-local positions)
// =====================================================================
const SHOTS = [
  { t0: 0, t1: 2.2, set: 'street', p0: [18.9, 1.45, -2.9], p1: [18.7, 1.45, -2.6], g0: [17.6, 2.5, 2.4], g1: [17.5, 2.5, 2.4], f0: 56, f1: 53, hand: 0.6 },
  // wake
  { t0: 2.2, t1: 5.0, set: 'bath', p0: [0.02, 1.88, -2.06], p1: [0.02, 1.88, -2.0], g0: [0, 1.88, -1.1], g1: [0, 1.9, -1.1], f0: 66, f1: 60, hand: 0.4 },
  { t0: 5.0, t1: 8.2, set: 'bath', p0: [1.05, 1.8, -1.9], p1: [0.98, 1.8, -1.85], g0: [0, 1.95, -1.25], g1: [0, 1.95, -1.25], f0: 54, f1: 50, hand: 0.6 },
  // cafe
  { t0: 8.2, t1: 10.6, set: 'open', p0: [0.4, 2.25, 1.55], p1: [0.38, 2.22, 1.42], g0: [0.1, 1.55, -1.6], g1: [0.1, 1.55, -1.6], f0: 56, f1: 53, hand: 0.7 },
  { t0: 10.6, t1: 12.9, set: 'open', p0: [0.55, 1.75, -0.95], p1: [0.6, 1.75, -0.9], g0: [1.3, 1.9, 0.45], g1: [1.3, 1.9, 0.45], f0: 50, f1: 47, hand: 0.6 },
  { t0: 12.9, t1: 15.2, set: 'open', p0: [0.9, 1.45, 2.35], p1: [0.85, 1.42, 2.45], g0: [-0.6, 1.35, 4.05], g1: [-0.6, 1.35, 4.05], f0: 52, f1: 49, hand: 0.6 },
  // street
  { t0: 15.2, t1: 17.4, set: 'street', p0: [-9.5, 1.7, 3.9], p1: [-8.8, 1.7, 3.8], g0: [0.5, 1.6, 1.0], g1: [1.0, 1.6, 1.0], f0: 46, f1: 44, hand: 0.8 },
  { t0: 17.4, t1: 18.8, set: 'street', p0: [0.4, 1.55, 2.4], p1: [0.5, 1.55, 2.3], g0: [2.5, 1.75, 0.3], g1: [2.5, 1.75, 0.3], f0: 50, f1: 47, hand: 0.6 },
  { t0: 18.8, t1: 22.2, set: 'street', p0: [4.55, 0.95, 0.35], p1: [4.5, 0.92, 0.45], g0: [4.5, 0.85, 2.8], g1: [4.5, 0.85, 2.8], f0: 56, f1: 54, hand: 0.7 },
  // date
  { t0: 22.2, t1: 25.6, set: 'dining', p0: [2.5, 1.95, -2.2], p1: [2.4, 1.92, -2.1], g0: [-0.1, 1.45, 0.3], g1: [-0.1, 1.45, 0.3], f0: 56, f1: 54, hand: 0.6 },
  { t0: 25.6, t1: 27.6, set: 'dining', p0: [-0.45, 1.45, 0.85], p1: [-0.42, 1.43, 0.8], g0: [0.75, 1.55, 0.3], g1: [0.75, 1.55, 0.3], f0: 50, f1: 47, hand: 0.6 },
  { t0: 27.6, t1: 29.2, set: 'dining', p0: [0.45, 1.45, -0.35], p1: [0.42, 1.43, -0.3], g0: [-0.8, 1.55, 0.2], g1: [-0.8, 1.55, 0.2], f0: 50, f1: 47, hand: 0.6 },
  // grandma
  { t0: 29.2, t1: 31.6, set: 'living', p0: [-1.5, 1.65, 0.0], p1: [-1.4, 1.62, 0.05], g0: [-0.1, 1.3, 2.0], g1: [-0.1, 1.3, 2.0], f0: 54, f1: 52, hand: 0.6 },
  { t0: 31.6, t1: 33.4, set: 'living', p0: [0.15, 1.6, 2.45], p1: [0.17, 1.6, 2.4], g0: [0.55, 1.9, 0.75], g1: [0.55, 1.9, 0.75], f0: 54, f1: 52, hand: 0.6 },
  { t0: 33.4, t1: 35.2, set: 'living', p0: [-0.1, 1.2, 1.15], p1: [-0.12, 1.2, 1.2], g0: [-0.5, 1.35, 2.35], g1: [-0.5, 1.35, 2.35], f0: 52, f1: 50, hand: 0.6 },
  // billionaire
  { t0: 35.2, t1: 37.6, set: 'street', p0: [11.4, 1.75, 4.2], p1: [11.6, 1.75, 4.1], g0: [19.5, 2.0, 2.2], g1: [18.5, 2.0, 2.2], f0: 48, f1: 46, hand: 0.7 },
  { t0: 37.6, t1: 39.8, set: 'street', p0: [16.0, 0.95, 0.75], p1: [15.7, 0.95, 0.75], g0: [19.2, 2.55, 2.3], g1: [18.4, 2.6, 2.3], f0: 52, f1: 50, hand: 0.6 },
  { t0: 39.8, t1: 42.4, set: 'street', p0: [17.6, 1.6, 3.35], p1: [17.4, 1.6, 3.35], g0: [14.6, 1.95, 4.1], g1: [14.6, 1.95, 4.1], f0: 52, f1: 50, hand: 0.7 },
  // payday
  { t0: 42.4, t1: 45.2, set: 'kitchen', p0: [0.25, 1.6, -1.75], p1: [0.2, 1.6, -1.6], g0: [0, 1.8, 0.8], g1: [0, 1.8, 0.8], f0: 54, f1: 52, hand: 0.6 },
  { t0: 45.2, t1: 48.0, set: 'kitchen', p0: [1.9, 1.75, -0.45], p1: [1.85, 1.73, -0.4], g0: [0, 1.6, 0.8], g1: [0, 1.6, 0.8], f0: 56, f1: 54, hand: 0.6 },
  // party
  { t0: 48.0, t1: 51.6, set: 'pool', p0: [4.3, 1.8, 4.6], p1: [4.2, 1.78, 4.4], g0: [2.7, 1.45, 0.4], g1: [2.7, 1.45, 0.4], f0: 52, f1: 50, hand: 0.6 },
  { t0: 51.6, t1: 61, set: 'pool', p0: [4.1, 1.85, 4.3], p1: [5.5, 7.0, 11.5], g0: [2.7, 1.4, 0.4], g1: [0.5, -0.5, -6.0], f0: 52, f1: 52, hand: 0.35, ease: 'slow' },
];

function storyUpdate(t) {
  TAGS.length = 0; FXW.length = 0;
  hideAll();
  const sc = sceneAt(t);
  SC[sc[0]](t, t - sc[2]);
}
function currentShot(t) { let i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = SHOTS.length - 1; return SHOTS[i]; }
