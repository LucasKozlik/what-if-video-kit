'use strict';
// =====================================================================
// PEOPLE — a realistic-proportioned rig with an expressive face.
//   body: pelvis, spine, neck, head; shoulder > elbow > hand; hip > knee > foot
//   face: shaped skull and jaw, nose, ears, eyes with iris + pupil, upper eyelids
//         that close, eyebrows that lift, lips and a mouth that opens, cheeks that puff
// Every part is one InstancedMesh shared by the whole cast (<12 heroes), posed
// on the CPU each frame from pure functions of story time.
// A cheaper merged-head crowd fills the stadium.
// =====================================================================

const PEOPLE = { cast: [], crowd: [] };
const SKINS = ['#e9bf9b', '#c68d68', '#8d5a3b', '#5e3a26', '#f0cdb0', '#b07650', '#d8a27c'];
const IRIS = ['#3b2a1c', '#4a3524', '#5b7aa0', '#2f2016', '#5e6b3a', '#4a3524'];
const HAIRC = ['#1a120c', '#2e1d12', '#5a3c22', '#a77b47', '#141414', '#6e3a1e', '#cfcac2'];

// ---------- head geometry: a skull, a jaw, a nose and ears, merged ----------
function headGeometry(sw = 40, sh = 30, features = true) {
  const g = new THREE.SphereGeometry(1, sw, sh), p = g.attributes.position;
  const eyes = [[-0.4, 0.3, 0.86], [0.4, 0.3, 0.86]];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ux = x, uy = y, uz = z;
    let X = x * 0.076, Y = y * 0.108, Z = z * 0.094;
    if (uy < 0) {                                         // jaw tapers to the chin
      const j = Math.pow(smooth(0, 1, -uy), 1.1);
      X *= 1 - 0.24 * j; Z *= 1 - 0.1 * j * (uz < 0 ? 1.6 : 0.4);
      Z += 0.014 * j * Math.max(0, uz);                   // chin comes forward
      Y *= 1.04;
    }
    X *= 1 + 0.05 * Math.exp(-Math.pow(uy + 0.05, 2) / 0.04) * Math.max(0, uz);   // cheekbones
    if (uz < 0) Z *= 1.06;                                 // the back of the skull
    if (uz > 0.5 && uy > 0.2) Z *= 0.985;                  // forehead
    for (const [ex, ey, ez] of eyes) {                     // eye sockets
      const d2 = (ux - ex) ** 2 + (uy - ey) ** 2 + (uz - ez) ** 2;
      Z -= 0.007 * Math.exp(-d2 / 0.025);
    }
    const brow = Math.exp(-Math.pow(uy - 0.5, 2) / 0.01) * Math.max(0, uz - 0.6);   // brow ridge
    Z += 0.004 * brow;
    p.setXYZ(i, X, Y, Z);
  }
  g.computeVertexNormals();
  const parts = [{ geo: g }];
  if (!features) { parts.push({ geo: new THREE.ConeGeometry(0.011, 0.034, 5).rotateX(Math.PI / 2 + 0.4), matrix: M4(0, -0.004, 0.1) }); return mergeGeoms(parts.map(o => ({ geo: o.geo, matrix: o.matrix, color: new THREE.Color(1, 1, 1) }))); }
  // nose: bridge + tip + wings
  const bridge = new THREE.SphereGeometry(1, 12, 10); parts.push({ geo: bridge, matrix: M4(0, 0.004, 0.0915, 0.35, 0, 0, 0.0075, 0.024, 0.009) });
  const tip = new THREE.SphereGeometry(0.0085, 10, 8); parts.push({ geo: tip, matrix: M4(0, -0.016, 0.099, 0, 0, 0, 1, 0.85, 0.9) });
  for (const s of [-1, 1]) {
    const w = new THREE.SphereGeometry(0.0062, 8, 6); parts.push({ geo: w, matrix: M4(s * 0.0085, -0.019, 0.092, 0, 0, 0, 1, 0.8, 1) });
    const ear = new THREE.SphereGeometry(1, 12, 10); parts.push({ geo: ear, matrix: M4(s * 0.075, 0.008, -0.006, 0, s * 0.35, 0, 0.011, 0.03, 0.019) });
  }
  return mergeGeoms(parts.map(o => ({ geo: o.geo, matrix: o.matrix, color: new THREE.Color(1, 1, 1) })));
}

// ---------- body parts ----------
function white(g) { g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; }
function taper(r0, r1, len, seg = 12) { const g = new THREE.CylinderGeometry(r1, r0, len, seg, 3); g.translate(0, -len / 2, 0); return g; }
function torsoGeometry(lo = false) {
  // pelvis at y=0, shoulders at y~0.5; a chest that is wider than the waist
  const g = new THREE.CylinderGeometry(1, 1, 1, lo ? 9 : 20, lo ? 4 : 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i);
    const w = lerp(0.15, 0.175, smooth(0, 0.35, y)) + 0.03 * smooth(0.55, 0.85, y) - 0.06 * smooth(0.88, 1, y);
    const d = lerp(0.1, 0.12, smooth(0.3, 0.7, y)) - 0.03 * smooth(0.88, 1, y) + 0.012 * Math.max(0, z) * smooth(0.55, 0.8, y);
    p.setXYZ(i, x * w * (1 + 0.15 * smooth(0.7, 0.9, y)), y * 0.52, z * d);
  }
  g.computeVertexNormals(); return g;
}
function handGeometry() {
  const P = [];
  const palm = new THREE.BoxGeometry(0.075, 0.085, 0.028, 2, 2, 1); palm.translate(0, -0.045, 0);
  P.push({ geo: palm });
  for (let f = 0; f < 4; f++) { const fg = new THREE.CapsuleGeometry(0.008, 0.05, 3, 6); P.push({ geo: fg, matrix: M4(-0.027 + f * 0.018, -0.115, 0.004, 0.2, 0, 0) }); }
  const th = new THREE.CapsuleGeometry(0.009, 0.04, 3, 6); P.push({ geo: th, matrix: M4(0.042, -0.05, 0.012, 0, 0, 0.6) });
  return mergeGeoms(P.map(o => ({ geo: o.geo, matrix: o.matrix, color: new THREE.Color(1, 1, 1) })));
}
function hairGeometry(style, lo = false) {
  const P = [];
  const cap = new THREE.SphereGeometry(1, lo ? 10 : 28, lo ? 6 : 16, 0, Math.PI * 2, 0, style === 'buzz' ? 1.25 : 1.5);
  const cp = cap.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    let x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
    // hairline: in front the hair stops at the top of the forehead, at the sides it comes down past the ears' top
    const minY = 0.12 + 0.5 * Math.max(0, z) * Math.max(0, z) + 0.1 * Math.max(0, z);
    if (y < minY) { const k = Math.sqrt(Math.max(0, 1 - minY * minY) / Math.max(1e-4, x * x + z * z)); y = minY; x *= k; z *= k; }
    cp.setXYZ(i, x * 0.081, y * 0.114, z * 0.1 - 0.004);
  }
  cap.computeVertexNormals();
  P.push({ geo: cap, matrix: M4(0, style === 'buzz' ? 0.002 : 0.006, -0.003) });
  if (style === 'long') {
    const back = new THREE.SphereGeometry(1, 16, 12); P.push({ geo: back, matrix: M4(0, -0.07, -0.05, -0.15, 0, 0, 0.085, 0.16, 0.05) });
  }
  if (style === 'bun') { const b = new THREE.SphereGeometry(0.04, 12, 10); P.push({ geo: b, matrix: M4(0, 0.07, -0.09) }); }
  if (style === 'curly') {
    const R = mulberry32(3);
    for (let k = 0; k < 90; k++) {
      const a = R() * 6.28, e = R() * 1.35;
      if (Math.sin(a) > 0.2 && e > 0.75) { k--; continue; }        // keep curls off the forehead
      const b = new THREE.SphereGeometry(0.014 + R() * 0.006, 7, 5);
      P.push({ geo: b, matrix: M4(Math.sin(e) * Math.cos(a) * 0.082, Math.cos(e) * 0.112 + 0.008, Math.sin(e) * Math.sin(a) * 0.098 - 0.01) });
    }
  }
  return mergeGeoms(P.map(o => ({ geo: o.geo, matrix: o.matrix, color: new THREE.Color(1, 1, 1) })));
}
function irisGeometry() {    // iris + pupil, iris tinted per person through instanceColor
  const iris = new THREE.SphereGeometry(0.0113, 16, 8, 0, Math.PI * 2, 0, 0.55); iris.rotateX(Math.PI / 2);
  const pupil = new THREE.SphereGeometry(0.01135, 12, 6, 0, Math.PI * 2, 0, 0.24); pupil.rotateX(Math.PI / 2);
  return mergeGeoms([{ geo: iris, color: new THREE.Color(1, 1, 1) }, { geo: pupil, color: new THREE.Color(0.01, 0.01, 0.01) }]);
}

const STYLE_LIST = ['short', 'long', 'buzz', 'bun', 'curly'];

function castDef() {
  const Z = -9.0;
  return [
    // name/role, look
    { role: 'stand', name: 'sam', x: -6, z: Z, face: 0.15, skin: 1, hair: 'curly', hairC: 0, shirt: '#c8452f', pants: '#2a3550', iris: 0, sleeves: 0, h: 1.0, tj: 0 },
    { role: 'stand', x: -4.5, z: Z - 0.7, face: -0.5, skin: 4, hair: 'long', hairC: 3, shirt: '#2f6fb5', pants: '#1d1d20', iris: 2, sleeves: 1, h: 0.96, tj: 0.05 },
    { role: 'stand', x: -7.6, z: Z - 1.3, face: 0.6, skin: 3, hair: 'buzz', hairC: 4, shirt: '#e9e6dc', pants: '#5a4a36', iris: 3, sleeves: 0, h: 1.04, tj: -0.04, elbow: true },
    { role: 'stand', x: -3.0, z: Z + 0.6, face: -1.2, skin: 0, hair: 'short', hairC: 2, shirt: '#3e6b48', pants: '#3a3a40', iris: 1, sleeves: 1, h: 1.0, tj: 0.08 },
    // cockpit: captain and first officer
    { role: 'sit', set: 'cockpit', x: -0.45, z: -0.5, face: Math.PI / 2, skin: 5, hair: 'short', hairC: 6, shirt: '#e8e8ea', pants: '#1d2333', iris: 0, sleeves: 0, h: 1.0, tc: T_COCKPIT },
    { role: 'sit', set: 'cockpit', x: -0.45, z: 0.5, face: Math.PI / 2, skin: 2, hair: 'bun', hairC: 0, shirt: '#e8e8ea', pants: '#1d2333', iris: 3, sleeves: 0, h: 0.96, tc: T_COCKPIT + 0.18 },
    // operating room: surgeon and patient
    { role: 'surgeon', set: 'or', x: 0.75, z: 0.2, face: -Math.PI / 2, skin: 6, hair: 'short', hairC: 1, shirt: '#3d8a83', pants: '#3d8a83', iris: 2, sleeves: 0, h: 1.0, tc: T_OR, mask: true },
    { role: 'lie', set: 'or', x: 0, z: 0, face: 0, skin: 0, hair: 'short', hairC: 2, shirt: '#8fb3c9', pants: '#8fb3c9', iris: 1, sleeves: 1, h: 1.0, tc: 999 },
    // the bedroom: Sam again, at home, holding it in
    { role: 'bed', set: 'bed', name: 'sam', x: 0, z: -0.12, face: 0, skin: 1, hair: 'curly', hairC: 0, shirt: '#d9d4c8', pants: '#6a7f9a', iris: 0, sleeves: 0, h: 1.0, tc: T_HOLD, hold: true },
    // the sunny street: two people step out of a doorway into bright light
    { role: 'sunwalk', x: 20.4, z: -11.6, face: 0, skin: 2, hair: 'long', hairC: 0, shirt: '#f2c230', pants: '#2a3550', iris: 3, sleeves: 0, h: 0.97, tc: T_SUN, k: 0 },
    { role: 'sunwalk', x: 21.4, z: -11.8, face: 0, skin: 4, hair: 'short', hairC: 3, shirt: '#2c2c30', pants: '#c8b89a', iris: 2, sleeves: 1, h: 1.02, tc: 999, k: 1 },
  ];
}

function buildPeople(scene) {
  PEOPLE.cast = castDef().map((d, i) => Object.assign({ i, ph: hash1(i * 3.1) * 6.28, tc: CHOO + (d.tj || 0) }, d));
  const N = PEOPLE.cast.length;
  const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0 });
  const cloth = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const mk = (geo, mat, mult = 1) => { const m = new THREE.InstancedMesh(geo, mat, N * mult); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const shoe = new THREE.BoxGeometry(0.095, 0.075, 0.26, 2, 1, 2); shoe.translate(0, -0.035, 0.05);
  const lid = new THREE.SphereGeometry(0.0123, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const brow = new THREE.CapsuleGeometry(0.0028, 0.026, 3, 6); brow.rotateZ(Math.PI / 2);
  const lip = new THREE.CapsuleGeometry(0.0032, 0.022, 3, 8); lip.rotateZ(Math.PI / 2); lip.scale(1, 0.85, 0.55);
  const mouthIn = new THREE.SphereGeometry(1, 12, 8);
  const mask = new THREE.SphereGeometry(1, 16, 10, -1.2, 2.4, 1.2, 1.1);
  const pelvis = new THREE.SphereGeometry(1, 14, 10); pelvis.scale(0.165, 0.11, 0.115);
  const shoulder = new THREE.SphereGeometry(0.058, 12, 8);
  PEOPLE.m = {
    thigh: mk(taper(0.074, 0.058, 0.45), cloth, 2), shin: mk(taper(0.055, 0.042, 0.44), cloth, 2), shoe: mk(shoe, cloth, 2),
    pelvis: mk(pelvis, cloth), torso: mk(torsoGeometry(), cloth), shoulder: mk(shoulder, cloth, 2),
    upper: mk(taper(0.05, 0.042, 0.29), cloth, 2), fore: mk(taper(0.041, 0.033, 0.26), cloth, 2), hand: mk(handGeometry(), skinMat, 2),
    neck: mk(white(taper(0.052, 0.05, 0.12)), skinMat), head: mk(headGeometry(), skinMat),
    eye: mk(new THREE.SphereGeometry(0.0112, 16, 12), new THREE.MeshStandardMaterial({ color: '#e9e4dc', roughness: 0.2 }), 2),
    iris: mk(irisGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15 }), 2),
    lid: mk(white(lid), skinMat, 2), brow: mk(brow, cloth, 2), lipU: mk(lip, cloth), lipL: mk(lip, cloth),
    mouth: mk(mouthIn, new THREE.MeshStandardMaterial({ color: '#2a0d0c', roughness: 0.7 })),
    mask: mk(mask, new THREE.MeshStandardMaterial({ color: '#7fb3c4', roughness: 0.9, side: THREE.DoubleSide })),
  };
  PEOPLE.hair = {};
  for (const st of STYLE_LIST) PEOPLE.hair[st] = mk(hairGeometry(st), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  const C = c => new THREE.Color(c);
  PEOPLE.cast.forEach((p, i) => {
    const M = PEOPLE.m, skin = C(SKINS[p.skin]);
    p.skinC = skin;
    for (const k of [0, 1]) {
      const j = i * 2 + k;
      M.thigh.setColorAt(j, C(p.pants)); M.shin.setColorAt(j, C(p.pants)); M.shoe.setColorAt(j, C(p.role === 'surgeon' ? '#e8e8e8' : '#1d1b1a'));
      M.shoulder.setColorAt(j, C(p.shirt)); M.upper.setColorAt(j, C(p.shirt)); M.fore.setColorAt(j, p.sleeves ? C(p.shirt) : skin);
      M.hand.setColorAt(j, p.role === 'surgeon' ? C('#d9e6f0') : skin);
      M.iris.setColorAt(j, C(IRIS[p.iris])); M.lid.setColorAt(j, skin.clone().multiplyScalar(0.92)); M.brow.setColorAt(j, C(HAIRC[p.hairC]).multiplyScalar(0.8));
    }
    M.pelvis.setColorAt(i, C(p.pants)); M.torso.setColorAt(i, C(p.shirt)); M.neck.setColorAt(i, skin); M.head.setColorAt(i, skin);
    const lipC = skin.clone().lerp(C('#9a4a44'), 0.45);
    M.lipU.setColorAt(i, lipC); M.lipL.setColorAt(i, lipC);
    for (const st of STYLE_LIST) PEOPLE.hair[st].setColorAt(i, C(p.role === 'surgeon' ? '#3d8a83' : HAIRC[p.hairC]));
  });
  buildCrowd(scene);
}

// ---------- stadium crowd: merged low-cost figures that still sneeze ----------
function buildCrowd(scene) {
  const head = headGeometry(12, 9, false);
  const hc = head.attributes.color;
  // bake dark eyes, brows and a mouth line into the crowd head so faces read from the stands
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const eye = z > 0.07 && Math.abs(y - 0.032) < 0.009 && Math.abs(Math.abs(x) - 0.032) < 0.011;
    const mouth = z > 0.07 && Math.abs(y + 0.045) < 0.005 && Math.abs(x) < 0.02;
    if (eye || mouth) hc.setXYZ(i, 0.12, 0.08, 0.07);
  }
  const hair = hairGeometry('short', true);
  const headAll = mergeGeoms([{ geo: head }, { geo: hair, color: new THREE.Color(0.25, 0.18, 0.12) }]);
  headAll.attributes.color.array.set(head.attributes.color.array, 0);
  const neckC = new THREE.Color(0.9, 0.72, 0.6);
  const bodyParts = [
    { geo: torsoGeometry(true), color: new THREE.Color(1, 1, 1), matrix: M4(0, 0.5, 0, 0, 0, 0, 0.88, 1, 0.9) },
    { geo: taper(0.045, 0.042, 0.1, 6), color: neckC, matrix: M4(0, 1.08, 0.005) },
    { geo: new THREE.SphereGeometry(0.06, 8, 6), color: new THREE.Color(1, 1, 1), matrix: M4(-0.2, 0.97, 0) },
    { geo: new THREE.SphereGeometry(0.06, 8, 6), color: new THREE.Color(1, 1, 1), matrix: M4(0.2, 0.97, 0) },
    { geo: taper(0.05, 0.04, 0.5, 6), color: new THREE.Color(1, 1, 1), matrix: M4(-0.21, 0.97, 0.02, 0.15, 0, 0.12) },
    { geo: taper(0.05, 0.04, 0.5, 6), color: new THREE.Color(1, 1, 1), matrix: M4(0.21, 0.97, 0.02, 0.15, 0, -0.12) },
    { geo: new THREE.SphereGeometry(1, 10, 8), color: new THREE.Color(0.35, 0.35, 0.4), matrix: M4(0, 0.47, 0.1, 0, 0, 0, 0.17, 0.11, 0.25) },
  ];
  const body = mergeGeoms(bodyParts);
  // standing version for the street: the same upper body on legs
  const legs = [-1, 1].map(sd => ({ geo: taper(0.07, 0.045, 0.9, 6), color: new THREE.Color(0.25, 0.27, 0.32), matrix: M4(sd * 0.09, 0.95, 0) }));
  const shoes = [-1, 1].map(sd => ({ geo: new THREE.BoxGeometry(0.1, 0.07, 0.25), color: new THREE.Color(0.1, 0.1, 0.1), matrix: M4(sd * 0.09, 0.035, 0.05) }));
  const standBody = mergeGeoms([...bodyParts.slice(0, -1).map(o => ({ ...o, matrix: new THREE.Matrix4().makeTranslation(0, 0.45, 0).multiply(o.matrix) })), ...legs, ...shoes]);
  PEOPLE.crowdHead = new THREE.InstancedMesh(headAll, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), STADIUM.seats.length);
  PEOPLE.crowdBody = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), STADIUM.seats.length);
  const R = mulberry32(19);
  const SH = ['#8a3a30', '#2f4f7a', '#c9a646', '#d8d4c8', '#2a2a2e', '#4a5e48', '#6a5a7a', '#a8642e', '#2f6a6a', '#7a3048', '#5a5a5e', '#b8b0a0', '#3a4a6a', '#9a8a6a'];
  STADIUM.seats.forEach((st, i) => {
    PEOPLE.crowd.push({ ...st, tj: (R() - 0.5) * 0.16, ph: R() * 6.28, s: 0.94 + R() * 0.12 });
    PEOPLE.crowdHead.setColorAt(i, new THREE.Color(SKINS[Math.floor(R() * SKINS.length)]));
    PEOPLE.crowdBody.setColorAt(i, new THREE.Color(SH[Math.floor(R() * SH.length)]));
  });
  for (const m of [PEOPLE.crowdHead, PEOPLE.crowdBody]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  // the crowded sidewalk: people waiting at the crossing, both sides of the avenue
  PEOPLE.street = [];
  const SR = mulberry32(23);
  for (let i = 0; i < 46; i++) {
    const side = i < 30 ? -1 : 1;
    let x = rr(-34, 12, SR), z = side * rr(7.8, 11.4, SR);
    if (side < 0 && Math.abs(x + 5.5) < 3.2 && z > -10.6) { i--; continue; }   // leave room around Sam
    PEOPLE.street.push({ x, y: 0.15, z, yaw: side < 0 ? rr(-0.6, 0.6, SR) : Math.PI + rr(-0.6, 0.6, SR), tj: (SR() - 0.5) * 0.16, ph: SR() * 6.28, s: 0.94 + SR() * 0.12 });
  }
  PEOPLE.sHead = new THREE.InstancedMesh(headAll, PEOPLE.crowdHead.material, PEOPLE.street.length);
  PEOPLE.sBody = new THREE.InstancedMesh(standBody, PEOPLE.crowdBody.material, PEOPLE.street.length);
  PEOPLE.street.forEach((c, i) => {
    PEOPLE.sHead.setColorAt(i, new THREE.Color(SKINS[Math.floor(SR() * SKINS.length)]));
    PEOPLE.sBody.setColorAt(i, new THREE.Color(SH[Math.floor(SR() * SH.length)]));
  });
  for (const m of [PEOPLE.sHead, PEOPLE.sBody]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
}

// ---------- posing ----------
const _R = new THREE.Matrix4(), _B = new THREE.Matrix4(), _H = new THREE.Matrix4(), _T = new THREE.Matrix4(), _U = new THREE.Matrix4(),
      _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const MX = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, order = 'XYZ') => {
  _pe.set(rx, ry, rz, order); _pq.setFromEuler(_pe);
  return new THREE.Matrix4().compose(_pv.set(x, y, z), _pq, _ps.set(sx, sy, sz));
};

function basePose() {
  return { x: 0, y: 0.95, z: 0, yaw: 0, pitch: 0, roll: 0, lean: 0, twist: 0, hx: 0, hy: 0, hz: 0,
    thL: 0, thR: 0, knL: 0, knR: 0, shLx: 0.05, shLz: 0.1, shRx: 0.05, shRz: 0.1, elL: 0.15, elR: 0.15,
    eyes: 0, brow: 0, mouth: 0.05, puff: 0, lookX: 0, lookY: 0, show: 1 };
}

// Where each set lives in the world (filled by world.js)
function setOrigin(p) { return p.set ? SETS[p.set] : SETS.street; }

function poseOf(p, s, t) {
  const P = basePose();
  const O = setOrigin(p);
  P.x = O.x + p.x; P.z = O.z + p.z; P.yaw = (O.yaw || 0) + p.face;
  const idle = noise1(t * 0.4 + p.ph);
  // blinking: a 150 ms blink every few seconds, deterministic
  const bk = (t + p.ph * 3) % (3.3 + (p.i % 3) * 0.7);
  P.eyes = bk < 0.15 ? Math.sin(bk / 0.15 * Math.PI) : 0;
  P.lookX = noise1(t * 0.3 + p.i * 7) * 0.25; P.lookY = noise1(t * 0.27 + p.i) * 0.1;

  switch (p.role) {
    case 'stand':
      P.y = 0.95 * p.h; P.hy = idle * 0.15; P.roll = idle * 0.02;
      P.shLz = 0.12; P.shRz = 0.12; P.elL = 0.25; P.elR = 0.25;
      break;
    case 'sit':                          // pilot's seat
      P.y = 0.62; P.thL = P.thR = -1.45; P.knL = P.knR = 1.45; P.lean = 0.08;
      P.shLx = P.shRx = -0.55; P.elL = P.elR = 0.9; P.shLz = P.shRz = 0.15; P.hx = 0.05;
      break;
    case 'bed':                          // sitting up in bed, legs out under the covers
      P.y = 0.7; P.thL = P.thR = -1.5; P.knL = P.knR = 0.05; P.lean = -0.1;
      P.shLx = P.shRx = -0.2; P.elL = P.elR = 0.6; P.shLz = P.shRz = 0.2;
      break;
    case 'lie':                          // patient, under anaesthetic, eyes closed
      P.y = 0.98; P.pitch = -Math.PI / 2; P.eyes = 1; P.mouth = 0.03; P.lookX = P.lookY = 0;
      break;
    case 'surgeon':
      P.y = 0.95; P.lean = 0.32; P.hx = 0.35;
      P.shLx = P.shRx = -0.95; P.elL = P.elR = 0.95; P.shLz = P.shRz = 0.05;
      break;
    case 'sunwalk': {                    // out of the doorway's shade, into bright sun
      const st = T_SUN - 2.8 + p.k * 0.35, d = clamp((s - st) * 1.1, 0, 2.9 - p.k * 0.6);
      P.z = O.z + p.z + d; P.y = 0.95 * p.h;
      const walking = s > st && d < 2.9 - p.k * 0.6;
      if (walking) {
        const ph = s * 5.4 + p.ph;
        P.thL = Math.sin(ph) * 0.42; P.thR = -P.thL; P.knL = Math.max(0, -Math.sin(ph)) * 0.6; P.knR = Math.max(0, Math.sin(ph)) * 0.6;
        P.shLx = -P.thL * 0.6; P.shRx = P.thL * 0.6; P.y -= Math.abs(Math.cos(ph)) * 0.02;
      }
      P.eyes = Math.max(P.eyes, smooth(T_SUN - 1.0, T_SUN - 0.6, s) * 0.4);   // squinting into the light
      break;
    }
  }

  // ---- the sneeze ----
  const tau = s - p.tc;
  const sp = sneezePhase(tau, p.hold);
  if (p.role !== 'lie') {
    P.hx += -0.42 * sp.inh + 0.62 * sp.jerk;
    P.lean += -0.06 * sp.inh + 0.32 * sp.jerk;
    P.y -= 0.03 * sp.jerk;
    P.eyes = Math.max(P.eyes, sp.eyes);
    P.brow = sp.brow; P.mouth = Math.max(P.mouth, sp.mouth); P.puff = sp.puff;
    P.shLz += 0.05 * sp.inh; P.shRz += 0.05 * sp.inh;
    if (p.elbow) {                     // good manners: into the elbow
      const e = smooth(-0.8, -0.1, tau) * (1 - smooth(0.6, 1.2, tau));
      P.shRx = lerp(P.shRx, -1.25, e); P.shRz = lerp(P.shRz, 0.55, e); P.elR = lerp(P.elR, 2.1, e); P.hy -= 0.35 * e;
    }
    if (p.role === 'surgeon') {        // turn away from the patient
      const a = smooth(-1.2, -0.3, tau) * (1 - smooth(1.2, 2.4, tau));
      P.twist = 1.05 * a; P.hy += 0.65 * a; P.lean -= 0.15 * a;
      P.shRx = lerp(P.shRx, -1.3, a); P.elR = lerp(P.elR, 2.0, a); P.shRz = lerp(P.shRz, 0.5, a);
    }
    if (p.hold) {                      // pinch the nose, clamp the mouth
      const a = smooth(-2.4, -1.6, tau) * (1 - smooth(1.6, 2.4, tau));
      P.shRx = lerp(P.shRx, -0.82, a); P.shRz = lerp(P.shRz, 0.46, a); P.elR = lerp(P.elR, 2.3, a);
      P.mouth = lerp(P.mouth, 0, a);
    }
  }
  return P;
}

function mouthPos(p, s, t, out) {      // world position of the mouth, for droplet origins
  const M = PEOPLE.m; poseMatrices(p, poseOf(p, s, t));
  return out.set(0, -0.046, 0.1).applyMatrix4(_H);
}
function headWorld(p, s, t, out, dy = 0) { poseMatrices(p, poseOf(p, s, t)); return out.set(0, dy, 0.02).applyMatrix4(_H); }

// compute the hierarchy into scratch matrices; returns nothing, fills _R (pelvis), _B (chest), _H (head)
const PM = { legs: [], arms: [] };
function poseMatrices(p, P) {
  _pe.set(P.pitch, P.yaw, P.roll, 'YXZ'); _pq.setFromEuler(_pe);
  _R.compose(_pv.set(P.x, P.y + (SETS_Y(p)), P.z), _pq, _ps.set(p.h, p.h, p.h));
  PM.legs.length = 0; PM.arms.length = 0;
  for (const [side, th, kn] of [[-1, P.thL, P.knL], [1, P.thR, P.knR]]) {
    const hip = _R.clone().multiply(MX(side * 0.09, -0.02, 0, th, 0, side * 0.03));
    const knee = hip.clone().multiply(MX(0, -0.45, 0, kn, 0, 0));
    const foot = knee.clone().multiply(MX(0, -0.44, 0, -kn - th * 0.5 * 0, 0, 0));
    PM.legs.push([hip, knee, foot]);
  }
  _B.copy(_R).multiply(MX(0, 0, 0, P.lean, P.twist, 0));
  for (const [side, sx, sz, el] of [[-1, P.shLx, P.shLz, P.elL], [1, P.shRx, P.shRz, P.elR]]) {
    const sh = _B.clone().multiply(MX(side * 0.185, 0.47, 0, sx, 0, side * sz, 1, 1, 1, 'ZYX'));
    const elb = sh.clone().multiply(MX(0, -0.29, 0, -el, 0, 0));
    const hand = elb.clone().multiply(MX(0, -0.26, 0, 0, side * -0.3, 0));
    PM.arms.push([sh, elb, hand]);
  }
  PM.neck = _B.clone().multiply(MX(0, 0.47, 0.005, P.hx * 0.3, P.hy * 0.3, 0));
  _H.copy(PM.neck).multiply(MX(0, 0.165, 0.012, P.hx * 0.7, P.hy * 0.7, P.hz));
}
function SETS_Y(p) { return (setOrigin(p).y || 0) + (p.role === 'stand' || p.role === 'sunwalk' ? 0.15 : 0); }

function writePeople(t) {
  const s = SN.s, M = PEOPLE.m;
  PEOPLE.cast.forEach((p, i) => {
    const P = poseOf(p, s, t);
    poseMatrices(p, P);
    PM.legs.forEach(([hip, knee, foot], k) => { M.thigh.setMatrixAt(i * 2 + k, hip); M.shin.setMatrixAt(i * 2 + k, knee); M.shoe.setMatrixAt(i * 2 + k, foot); });
    M.pelvis.setMatrixAt(i, _R);
    M.torso.setMatrixAt(i, _B);
    PM.arms.forEach(([sh, elb, hand], k) => {
      M.shoulder.setMatrixAt(i * 2 + k, sh); M.upper.setMatrixAt(i * 2 + k, sh); M.fore.setMatrixAt(i * 2 + k, elb); M.hand.setMatrixAt(i * 2 + k, hand);
    });
    M.neck.setMatrixAt(i, _T.copy(PM.neck).multiply(MX(0, 0.12, 0)));
    // the head, with cheeks puffing when the sneeze is held in
    _T.copy(_H).multiply(MX(0, 0, 0, 0, 0, 0, 1 + P.puff * 0.13, 1, 1 + P.puff * 0.05));
    M.head.setMatrixAt(i, _T);
    for (const st of STYLE_LIST) PEOPLE.hair[st].setMatrixAt(i, st === p.hair ? _H : _zero);
    for (const [k, side] of [[0, -1], [1, 1]]) {
      const base = _H.clone().multiply(MX(side * 0.031, 0.03, 0.074));
      M.eye.setMatrixAt(i * 2 + k, base);
      M.iris.setMatrixAt(i * 2 + k, base.clone().multiply(MX(0, 0, 0, -P.lookY, P.lookX, 0)));
      // upper lid: open sits back on the brow, closed comes down over the eye
      M.lid.setMatrixAt(i * 2 + k, base.clone().multiply(MX(0, 0, 0, lerp(-0.55, 1.55, P.eyes), 0, 0)));
      M.brow.setMatrixAt(i * 2 + k, _H.clone().multiply(MX(side * 0.032, 0.05 + P.brow * 0.007, 0.087, -0.15, 0, side * (0.08 - P.brow * 0.12))));
    }
    const open = P.mouth;
    M.lipU.setMatrixAt(i, _H.clone().multiply(MX(0, -0.037, 0.0885, 0, 0, 0, 1 + P.puff * 0.2, 1, 1)));
    M.lipL.setMatrixAt(i, _H.clone().multiply(MX(0, -0.0445 - open * 0.022, 0.087 - open * 0.004, 0, 0, 0, 1 - open * 0.15, 1, 1)));
    M.mouth.setMatrixAt(i, _H.clone().multiply(MX(0, -0.041 - open * 0.011, 0.079, 0, 0, 0, 0.0135 - open * 0.002, 0.002 + open * 0.013, 0.012)));
    M.mask.setMatrixAt(i, p.mask ? _H.clone().multiply(MX(0, -0.02, 0.0, 0, 0, 0, 0.083, 0.1, 0.104)) : _zero);
  });
  for (const m of Object.values(M)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  for (const m of Object.values(PEOPLE.hair)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }

  // crowd: everyone sneezes at CHOO (a little ragged)
  PEOPLE.crowd.forEach((c, i) => {
    const sp = sneezePhase(s - CHOO - c.tj);
    const sway = noise1(t * 0.5 + c.ph) * 0.05;
    _R.compose(_pv.set(c.x, c.y, c.z), _pq.setFromEuler(_pe.set(0.32 * sp.jerk - 0.05 * sp.inh, c.yaw + sway, 0)), _ps.set(c.s, c.s, c.s));
    PEOPLE.crowdBody.setMatrixAt(i, _R);
    _T.copy(_R).multiply(MX(0, 1.13, 0.015, -0.45 * sp.inh + 0.6 * sp.jerk, sway * 2, 0)).multiply(MX(0, 0.1, 0));
    PEOPLE.crowdHead.setMatrixAt(i, _T);
  });
  PEOPLE.crowdHead.instanceMatrix.needsUpdate = PEOPLE.crowdBody.instanceMatrix.needsUpdate = true;
  PEOPLE.street.forEach((c, i) => {
    const sp = sneezePhase(s - CHOO - c.tj), sway = noise1(t * 0.5 + c.ph) * 0.05;
    _R.compose(_pv.set(c.x, c.y, c.z), _pq.setFromEuler(_pe.set(0, c.yaw + sway, 0)), _ps.set(c.s, c.s, c.s));
    _T.copy(_R).multiply(MX(0, 0.45, 0, 0.3 * sp.jerk - 0.05 * sp.inh, 0, 0));
    PEOPLE.sBody.setMatrixAt(i, _U.copy(_R).multiply(MX(0, 0, 0, 0, 0, 0)));
    PEOPLE.sHead.setMatrixAt(i, _T.multiply(MX(0, 1.13, 0.015, -0.45 * sp.inh + 0.6 * sp.jerk, sway * 2, 0)).multiply(MX(0, 0.1, 0)));
  });
  PEOPLE.sHead.instanceMatrix.needsUpdate = PEOPLE.sBody.instanceMatrix.needsUpdate = true;
}

window.lifeStats = () => ({ cast: PEOPLE.cast.length, crowd: PEOPLE.crowd.length });
