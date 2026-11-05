'use strict';
// =====================================================================
// THE FIELD — how geeked the planet is, over film time.
// One number, GK.geek (0..1), drives everything: how people move, how cars
// drive, the camera sway, and the post-process wobble/colour. The rest are
// comedy counters, keyframed so each lands on its caption.
//
// Film time t maps to story time s: the cold open (t < COLD) shows the
// dance-circle climax, then the film plays from a normal Monday morning.
// =====================================================================

const COLD = 2.4;
const G0 = 6.0, G1 = 7.6;          // the moment everyone on Earth gets geeked
const SOBER0 = 44.2, SOBER1 = 46.6; // ...and the moment it wears off

const GK = { t: 0, s: 0, geek: 0, people: 0, snacks: 1, crashes: 0, circle: 0, stocks: 0, silence: 0 };

const GK_K = {
  snacks:  [[0, 1], [19.8, 1], [22.6, 0.0], [61, 0]],
  crashes: [[0, 0], [10.5, 0], [13.8, 9], [41, 9], [61, 9]],
  circle:  [[0, 0], [34.8, 1], [36, 14], [37.6, 1204], [39.2, 9500], [40.8, 40000], [61, 40000]],
  stocks:  [[0, 0], [26.2, 0], [28.6, 900], [61, 900]],
};

function storyTime(t) { return t < COLD ? 39.6 + t * 0.5 : t; }

function updateField(t) {
  const s = storyTime(t);
  GK.t = t; GK.s = s;
  GK.geek = smooth(G0, G1, s) * (1 - smooth(SOBER0, SOBER1, s));
  // 8 billion, but it spreads: the counter climbs over orders of magnitude
  const u = clamp((s - G0) / (G1 - G0 + 0.4), 0, 1);
  const back = 1 - clamp((s - SOBER0) / (SOBER1 - SOBER0), 0, 1);
  GK.people = u <= 0 || back <= 0 ? 0 : Math.min(8.1e9, Math.pow(10, Math.min(u, back) * 9.92));
  GK.snacks = trackLin(GK_K.snacks, s);
  GK.crashes = trackLin(GK_K.crashes, s);
  GK.circle = trackLin(GK_K.circle, s);
  GK.stocks = trackLin(GK_K.stocks, s);
  // "but here's the scary part": the music and the colour drop out
  GK.silence = smooth(41.0, 41.3, s) * (1 - smooth(43.9, 44.3, s));
}
