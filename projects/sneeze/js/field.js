'use strict';
// =====================================================================
// THE FIELD — one synchronized sneeze.
//  * a global clock counting down to 12:00:00 (CHOO)
//  * a per-person sneeze phase (inhale "ah-ah-", eyes shut, CHOO, recovery)
//  * a droplet-cloud field: a turbulent puff travelling outward from each
//    face and hanging in the air. cloudReach() exists once in JS and once in
//    GLSL, side by side, so the HUD tape measure and the visible droplets agree.
//
// Film time t maps to story time s. Some beats are replays of the same
// moment (slow-motion myth-buster, side-on cloud), so everything reads s.
// =====================================================================

const COLD = 2.5;
const CHOO = 10.6;                 // 12:00:00 — everyone, everywhere
// other sets sneeze on their own beat (same event, shown one place at a time)
const T_HIGHWAY = 28.0, T_COCKPIT = 32.2, T_OR = 34.7, T_HOLD = 45.6, T_SUN = 55.0;
const WAIT0 = 41.0, WAIT1 = 44.0;

const SN = { t: 0, s: 0, clock: 0, sneezed: 0, droplets: 0, airflow: 0, blind: 0, silence: 0, flash: 0 };

function storyTime(t) {
  if (t < COLD) return CHOO + 0.22 + t * 0.12;           // cold open: mid-CHOO, slow motion
  if (t >= 13 && t < 19) return CHOO - 0.1 + (t - 13) * 0.11;  // myth-buster replay, slow motion
  if (t >= 19 && t < 25) return CHOO + 0.05 + (t - 19) * 1.0;  // side-on cloud, real time
  return t;
}

// The droplet cloud's leading edge, metres from the mouth, tau seconds after the sneeze.
// Bourouiba (JAMA 2020): the turbulent gas cloud can carry droplets 7-8 m.
// MUST MATCH cloudReachGLSL below.
function cloudReach(tau) { return tau <= 0 ? 0 : 7.6 * (1 - Math.exp(-tau / 1.7)); }
const CLOUD_GLSL = `float cloudReach(float tau){ return tau <= 0.0 ? 0.0 : 7.6 * (1.0 - exp(-tau / 1.7)); }`;

// Peak airflow at the mouth: Tang et al. (PLOS ONE 2013) measured about 4.5 m/s (~10 mph).
function airflowMph(tau) { return tau < 0 ? 0 : 10.1 * (tau / 0.06) * Math.exp(1 - tau / 0.06); }

// The face and body of one sneeze, tau seconds from the CHOO. All 0..1.
function sneezePhase(tau, hold = false) {
  const P = { inh: 0, eyes: 0, mouth: 0, brow: 0, jerk: 0, puff: 0 };
  if (tau < -4.8 || tau > 2.2) return P;
  if (tau < 0) {
    const bump = (c, w) => Math.exp(-Math.pow((tau - c) / w, 2));
    P.inh = smooth(-4.8, -0.2, tau) * 0.85 + 0.15 * (bump(-3.1, 0.22) + bump(-1.7, 0.22));
    P.brow = smooth(-4.6, -2.0, tau);
    P.mouth = 0.15 + 0.55 * P.inh;
    P.eyes = smooth(-1.6, -0.05, tau) * 0.75 + 0.25 * smooth(-0.25, -0.02, tau);
  } else {
    const fade = 1 - smooth(0.0, 0.14, tau);
    P.inh = 0.98 * fade;
    P.brow = (1 - smooth(0.0, 0.6, tau)) * -0.6;            // furrow on the CHOO
    P.eyes = 1 - smooth(0.72, 0.95, tau);                    // eyes reflexively shut
    if (hold) {                                              // nose pinched, mouth clamped: nowhere to go
      P.puff = smooth(0, 0.08, tau) * (1 - smooth(0.6, 1.4, tau));
      P.jerk = 0.35 * smooth(0, 0.06, tau) * (1 - smooth(0.25, 0.9, tau));
      P.mouth = 0;
    } else {
      P.jerk = smooth(0, 0.09, tau) * (1 - smooth(0.32, 1.2, tau));
      P.mouth = 0.75 * smooth(0, 0.03, tau) * (1 - smooth(0.12, 0.5, tau)) + 0.1;
    }
  }
  return P;
}

// seconds past midnight: 11:59:57 when the film opens, 12:00:00 at CHOO (the run-up is slow motion)
const clockAt = s => s < CHOO ? 43200 - 3 * (CHOO - Math.max(s, COLD)) / (CHOO - COLD) : 43200 + (s - CHOO);
function fmtClock(sec) {
  const h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60, sc = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sc.toFixed(1).padStart(4, '0')}`;
}

function updateField(t) {
  const s = storyTime(t);
  SN.t = t; SN.s = s;
  SN.clock = clockAt(s);
  const done = smooth(CHOO - 0.04, CHOO + 0.08, s);
  SN.sneezed = 8.2e9 * done;
  SN.droplets = 40000 * 8.2e9 * smooth(CHOO, CHOO + 0.4, s);
  SN.airflow = airflowMph(s - CHOO) * (s - CHOO < 1.2 ? 1 : 0);
  SN.blind = 26.8 * clamp(t - T_HIGHWAY, 0, 1) * (t > 25 && t < 31 ? 1 : 0) + (t >= 31 ? 26.8 : 0);
  SN.silence = smooth(WAIT0, WAIT0 + 0.2, t) * (1 - smooth(WAIT1 - 0.2, WAIT1, t));
  SN.flash = t >= CHOO && t < 13 ? Math.exp(-(t - CHOO) * 4.5) : 0;
}
