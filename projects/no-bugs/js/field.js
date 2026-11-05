'use strict';
// =====================================================================
// THE FIELD — for this video it is not a force, it is the state of an
// ecosystem over time. Every visual reads ECO: the insects, the flowers,
// the birds, the orchard, the litter that nothing breaks down, the grade.
//
// Film time t maps to "story time" s. The cold open (t < COLD) shows the
// end state, then the film plays the story from the start. Everything is a
// pure function of t, so any frame can be seeked to exactly.
// =====================================================================

const COLD = 2.6;          // cold open length

const ECO = {
  t: 0, s: 0,
  insects: 1,      // 0..1 fraction of insects still alive (the vanishing happens 6.6..8.6 s)
  flowers: 1,      // 0..1 wildflower vitality (bloom -> wilted -> mostly gone)
  birds: 1,        // 0..1 songbirds remaining
  litter: 0,       // 0..1 dung, dead leaves and fallen fruit nothing breaks down
  green: 1,        // 0..1 meadow greenness
  apples: 1,       // 0..1 fruit on the orchard
  blossom: 0,      // 0..1 orchard blossom (next spring)
  sat: 1,          // grade saturation
  warm: 1,         // grade warmth
  haze: 0,         // 0..1 pale, flat sky
  day: 0,          // days since the insects vanished (counter)
};

// Story keyframes, in film seconds. Two equal keys in a row hold a value.
const K = {
  flowers: [[0, 1], [12, 1], [17, 0.85], [24, 0.62], [30, 0.45], [33, 0.5], [44, 0.32], [50, 0.1], [61, 0.06]],
  birds:   [[0, 1], [17.5, 1], [20, 0.82], [23.5, 0.5], [30, 0.36], [44, 0.22], [52, 0.08], [61, 0.06]],
  litter:  [[0, 0], [12, 0], [24, 0.25], [29, 0.6], [44, 0.8], [52, 1], [61, 1]],
  green:   [[0, 1], [15, 1], [27, 0.72], [33, 0.66], [44, 0.42], [50, 0.12], [61, 0.08]],
  apples:  [[0, 1], [29.5, 1], [30.2, 0], [61, 0]],          // new season: last year's fruit is picked
  blossom: [[0, 0], [29.5, 0], [31, 1], [33.5, 1], [36.5, 0.15], [40, 0], [61, 0]],
  sat:     [[0, 1.1], [8.6, 1.08], [15, 1], [29, 0.88], [33, 0.92], [45, 0.74], [52, 0.62], [61, 0.6]],
  warm:    [[0, 1], [15, 1], [33, 0.95], [52, 0.85], [61, 0.85]],
  haze:    [[0, 0], [15, 0], [30, 0.2], [45, 0.45], [52, 0.62], [61, 0.65]],
  // days since vanishing — a story-time counter, piecewise linear so it never runs backwards
  day:     [[0, 0], [8.6, 0], [9, 1], [15, 6], [18, 14], [24, 30], [30, 75], [33, 240], [39, 300], [45, 400], [52, 640], [56, 730], [61, 730]],
};

// Vanishing window, film seconds. Each insect gets its own moment inside it.
const VANISH0 = 6.6, VANISH1 = 8.6;

function storyTime(t) { return t < COLD ? 50 : t; }

function updateField(t) {
  const s = storyTime(t);
  ECO.t = t; ECO.s = s;
  ECO.insects = 1 - clamp((s - VANISH0) / (VANISH1 - VANISH0), 0, 1);
  ECO.flowers = trackLin(K.flowers, s);
  ECO.birds = trackLin(K.birds, s);
  ECO.litter = trackLin(K.litter, s);
  ECO.green = trackLin(K.green, s);
  ECO.apples = trackLin(K.apples, s);
  ECO.blossom = trackLin(K.blossom, s);
  ECO.sat = trackLin(K.sat, s);
  ECO.warm = trackLin(K.warm, s);
  ECO.haze = trackLin(K.haze, s);
  ECO.day = trackLin(K.day, s);
}

// Is insect i (with per-insect jitter u in 0..1) alive at story time s?
const insectVanishAt = u => VANISH0 + u * (VANISH1 - VANISH0);
