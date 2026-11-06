'use strict';
// =====================================================================
// LABELS — the number over every head. HTML, projected from 3D each frame,
// so the type stays razor sharp at 1080x1920 and the exporter's page
// screenshot captures it. Everything is a pure function of film time.
// =====================================================================

const LBL = { els: [], box: null };
const fmtMoney = (v, full) => {
  const a = Math.abs(v), sgn = v < 0 ? '−' : '';
  if (full || a < 1e6) return sgn + '$' + Math.round(a).toLocaleString('en-US');
  if (a < 1e9) return sgn + '$' + (a / 1e6).toFixed(a < 1e7 ? 2 : 1) + 'M';
  return sgn + '$' + (a / 1e9).toFixed(1) + 'B';
};

function buildLabels() {
  LBL.box = document.getElementById('labels');
  for (const p of PEOPLE) {
    const d = document.createElement('div');
    d.className = 'nw' + (p === BILLIONAIRE ? ' bill' : '');
    d.innerHTML = '<span></span>';
    LBL.box.appendChild(d);
    LBL.els.push({ d, s: d.firstChild, cls: '', txt: '' });
  }
}

const _lv = new THREE.Vector3(), _lc = new THREE.Vector3();
function writeLabels(t, camera) {
  const st = storyT(t);
  const W = LBL.box.clientWidth, H = LBL.box.clientHeight;
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  camera.updateMatrixWorld();
  const dimOthers = smooth(BILL.revealT + 1.0, BILL.revealT + 2.6, st) * 0.45;
  PEOPLE.forEach((p, i) => {
    const L = LBL.els[i];
    const v = visibleNow(p, st) ? shownValue(p, st) : null;
    if (v == null || p.hidden) { if (L.on !== false) { L.d.style.display = 'none'; L.on = false; } return; }
    const isB = p === BILLIONAIRE;
    _lv.set(p.pos.x, p.h * 1.0 + (Math.abs(p.pos.z) >= 7 ? 0.16 : 0) + (isB ? 0.42 : 0.3), p.pos.z);
    _lc.copy(_lv).applyMatrix4(camera.matrixWorldInverse);
    const depth = -_lc.z;
    if (depth < 0.6) { if (L.on !== false) { L.d.style.display = 'none'; L.on = false; } return; }
    _lv.project(camera);
    const x = (_lv.x * 0.5 + 0.5) * W, y = (-_lv.y * 0.5 + 0.5) * H;
    if (x < -200 || x > W + 200 || y < -100 || y > H + 100) { if (L.on !== false) { L.d.style.display = 'none'; L.on = false; } return; }
    if (L.on !== true) { L.d.style.display = 'block'; L.on = true; }

    const worldH = isB ? 0.34 : 0.2;
    let px = worldH * H / (2 * depth * tanH);
    const minPx = H * 0.0068;
    const dot = !isB && px < minPx;
    px = clamp(px, minPx, H * (isB ? 0.05 : 0.034));
    const age = st - p.revealT;
    const pop = age < 0.45 ? 1 + 2.4 * Math.pow(age / 0.45 - 1, 3) + 1.4 * Math.pow(age / 0.45 - 1, 2) : 1;
    const foc = DIR.focus, isF = p === foc;
    let op = clamp(age / 0.18, 0, 1) * (isB ? 1 : 1 - dimOthers) * (1 - smooth(110, 170, depth));
    if (foc && !isF) op *= 0.38;
    if (!isF && !isB) op *= smooth(H * 0.19, H * 0.235, y - px * 1.2);   // keep clear of the counters
    if (isF && !isB) px = Math.max(px, H * 0.03);

    const cls = dot ? 'dot ' : '';
    const tone = isB ? 'gold' : p.value < 0 ? 'neg' : p.value >= 1e6 ? 'rich' : 'pos';
    const want = cls + tone;
    if (want !== L.cls) { L.d.className = 'nw ' + want + (isB ? ' bill' : ''); L.cls = want; }
    const txt = dot ? '' : fmtMoney(v, isB);
    if (txt !== L.txt) { L.s.textContent = txt; L.txt = txt; }
    L.d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${(0.35 + 0.65 * pop).toFixed(3)})`;
    L.d.style.fontSize = (dot ? Math.max(3, px * 0.55) : px).toFixed(2) + 'px';
    L.d.style.opacity = op.toFixed(3);
    L.d.style.zIndex = String(isB || isF ? 99999 : 50000 - Math.round(depth * 100));
  });
}
