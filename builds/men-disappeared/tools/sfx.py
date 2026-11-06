#!/usr/bin/env python3
"""Synthesize the soundtrack + sound effects, synced to the sim's event times.

    python3 tools/sfx.py            -> tools/out/sfx.wav  (48 kHz stereo, 41.5 s)

Every effect is procedural (numpy/scipy) and deterministic. Times come from the
scene code: T_EVENT = 6.0, the volleyball bounces from world.js ballistic(), the
jet ski beaching at (150-31)/7.2 s, the counter landing on 1 at 7.7 s, shot cuts
from director.js. Levels follow the camera: the grill is loud in its own shot and
faint from the towel, the jet ski engine is loud by the shore and far off in POV.
"""
import numpy as np
from scipy import signal
import wave, os

SR = 48000
DUR = 41.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

T_EVENT = 6.0
JS_BEACH = (150 - 31) / 7.2            # 16.53 s
CUTS = [0, 2.2, 7.7, 10.4, 13.0, 15.6, 18.6, 21.4, 24.4, 30.0, 35.4]
SHOT = {'cold': (0, 2.2), 'pov1': (2.2, 7.7), 'volley': (7.7, 10.4), 'couple': (10.4, 13.0),
        'grill': (13.0, 15.6), 'jetski': (15.6, 18.6), 'tower': (18.6, 21.4), 'wide': (21.4, 24.4),
        'overhead': (24.4, 30.0), 'pov2': (30.0, 41.5)}


def S(sec): return int(round(sec * SR))
def noise(n, r=rng): return r.standard_normal(n)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)
def smooth(e0, e1, x):
    u = np.clip((x - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u)


def shot_gain(levels, default=0.0, xf=0.03):
    """Per-sample gain from {shot: level}, with tiny crossfades at hard cuts."""
    g = np.full(N, default, dtype=float)
    for k, v in levels.items():
        a, b = SHOT[k]; g[S(a):S(b)] = v
    k = max(1, S(xf)); return np.convolve(g, np.ones(k) / k, mode='same')


def add(x, at, gain=1.0, pan=0.0):
    """Mix mono x into the stereo bus at time `at` (s); pan -1..1."""
    i = S(at)
    if i >= N: return
    x = x[:N - i] * gain
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    L[i:i + len(x)] += x * gl; R[i:i + len(x)] += x * gr


def env(n, a, d):
    """attack a s, exponential decay with time-constant d s."""
    tt = np.arange(n) / SR
    return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)


# ---------------------------------------------------------------- ambience
# surf: low roar swelling with each wave + a bright wash on each break
wave_ph = 2 * np.pi * t / 6.8
swell = 0.55 + 0.45 * np.sin(wave_ph) ** 2
roar = lp(noise(N), 500) * swell
wash_env = np.clip(np.sin(wave_ph - 0.6), 0, 1) ** 6
wash = bp(noise(N), 1500, 7000) * wash_env
roar2 = lp(noise(N), 500) * swell        # decorrelated R channel
surf_lvl = shot_gain({'cold': 0.10, 'pov1': 0.18, 'volley': 0.16, 'couple': 0.16, 'grill': 0.14,
                      'jetski': 0.32, 'tower': 0.30, 'wide': 0.16, 'overhead': 0.10, 'pov2': 0.12})
surf_lvl *= 1 - 0.75 * smooth(35.4, 37.0, t)
L += (roar * 1.0 + wash * 0.22) * surf_lvl
R += (roar2 * 1.0 + wash * 0.22) * surf_lvl

# beach crowd murmur: several "voices" (formant-band noise, syllable-rate AM)
def voices(n_voices, lo, hi, seed):
    r = np.random.default_rng(seed); out = np.zeros(N)
    for v in range(n_voices):
        f0 = r.uniform(lo, hi)
        band = bp(noise(N, r), f0 * 0.7, f0 * 2.4)
        syl = r.uniform(3.5, 6.0)
        am = np.clip(np.sin(2 * np.pi * syl * t + r.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * 0.9 * t + v), 0, None) ** 1.5
        talk = (np.sin(2 * np.pi * r.uniform(0.08, 0.2) * t + r.uniform(0, 6)) > -0.2).astype(float)
        talk = np.convolve(talk, np.ones(S(0.15)) / S(0.15), mode='same')
        out += band * am * talk
    return out / np.sqrt(n_voices)

men = voices(8, 220, 420, 11)       # lower voices: gone at the event
women = voices(10, 450, 900, 12)
crowd_lvl = shot_gain({'cold': 0.05, 'pov1': 0.16, 'volley': 0.14, 'couple': 0.14, 'grill': 0.12,
                       'jetski': 0.07, 'tower': 0.09, 'wide': 0.16, 'overhead': 0.10, 'pov2': 0.12})
men_g = crowd_lvl * (1 - smooth(T_EVENT, T_EVENT + 0.08, t))
# women: everyone stops mid-sentence, a beat of silence, then confused chatter builds;
# while they all stare at you it hushes again
wom_g = crowd_lvl * (1 - 0.9 * smooth(T_EVENT + 0.15, T_EVENT + 0.6, t) * (1 - smooth(9.0, 12.0, t)))
wom_g *= 1 + 0.6 * smooth(19, 23, t) * (1 - smooth(24.4, 26.5, t))
wom_g *= 1 - 0.8 * smooth(26.0, 29.0, t)
wom_g *= np.where(t < 2.2, 0.0, 1.0) + np.where(t < 2.2, 1.0, 0.0) * 0.4
L += men * men_g * 0.9 + women * wom_g
R += men[::-1] * 0 + np.roll(men, S(0.013)) * men_g * 0.9 + np.roll(women, S(0.011)) * wom_g

# ---------------------------------------------------------------- one-shots
def gull(at, pan, gain=0.07, n=3):
    for k in range(n):
        d = 0.22 + 0.05 * k; nn = S(d); tt = np.arange(nn) / SR
        f = 1900 - 700 * (tt / d) + 120 * np.sin(2 * np.pi * 18 * tt)
        ph = 2 * np.pi * np.cumsum(f) / SR
        x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.sin(np.pi * tt / d) ** 0.6
        add(x, at + k * 0.3, gain * (1 - 0.15 * k), pan)

for at, pan, g in [(2.9, -0.6, 0.06), (11.6, 0.5, 0.04), (19.4, -0.3, 0.08), (22.8, 0.6, 0.05), (38.0, -0.4, 0.03)]:
    gull(at, pan, g)

def thud(freq=150, dur=0.18, click=0.3, bright=2500):
    nn = S(dur); tt = np.arange(nn) / SR
    body = np.sin(2 * np.pi * freq * tt * (1 - 0.3 * tt / dur)) * np.exp(-tt / (dur * 0.3))
    c = lp(noise(nn), bright) * np.exp(-tt / 0.012) * click
    return body + c

def ball_hit():                        # hand on volleyball: tight "pok"
    nn = S(0.12); tt = np.arange(nn) / SR
    return np.sin(2 * np.pi * 420 * tt) * np.exp(-tt / 0.018) + bp(noise(nn), 800, 4000) * np.exp(-tt / 0.01) * 0.6

def sand_thud(v):                      # ball into sand: soft, with a little spray
    nn = S(0.35); tt = np.arange(nn) / SR
    x = lp(noise(nn), 250) * np.exp(-tt / 0.05) * 1.6 + np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.06)
    x += bp(noise(nn), 2000, 6000) * np.exp(-tt / 0.09) * 0.25
    return x * min(1, v / 10)

# rally contacts before the event (period 2.2 s), the high set at 5.7
for at in [4.4]: add(ball_hit(), at, 0.10, 0.5)
add(ball_hit(), 5.7, 0.12, 0.45)
# lob lands on the empty side (sim: 8.383 s, 9.792 s, 10.492 s ...)
for at, v in [(8.383, 13.8), (9.792, 6.9), (10.492, 3.4), (10.837, 1.7), (11.008, 0.8)]:
    in_shot = 1.0 if at < 10.4 else 0.18
    add(sand_thud(v), at, 0.55 * in_shot, -0.1)

# THE EVENT ---------------------------------------------------------------
# record scratch: a sharp downward pitch sweep with vinyl noise
nn = S(0.42); tt = np.arange(nn) / SR
f = 900 * np.exp(-tt * 9) + 70
ph = 2 * np.pi * np.cumsum(f) / SR
scratch = (signal.sawtooth(ph) * 0.5 + bp(noise(nn), 1200, 5000) * 0.6) * np.minimum(1, tt / 0.01) * np.exp(-tt / 0.16)
add(lp(scratch, 6000), T_EVENT - 0.02, 0.32)
# sand poof: one burst per vanishing man, panned where he was in the POV
nn = S(0.9); tt = np.arange(nn) / SR
poof = (bp(noise(nn), 900, 5500) * np.minimum(1, tt / 0.015) * np.exp(-tt / 0.18)
        + lp(noise(nn), 300) * np.exp(-tt / 0.08) * 0.8)
for at, pan, g in [(6.0, 0.55, 0.42), (6.01, -0.05, 0.34), (6.02, 0.3, 0.26), (6.03, -0.45, 0.22)]:
    add(poof, at, g, pan)
# sand trickling down afterwards (sparse grains)
nn = S(1.8); grains = np.zeros(nn)
idx = rng.integers(0, nn, 900); grains[idx] = rng.uniform(-1, 1, 900) * np.exp(-idx / SR / 0.7)
grains = hp(grains, 3000) * 3
add(grains, 6.15, 0.10, 0.2)
# cooler hits the sand, spatula clatters off the grill
add(thud(110, 0.25, 0.6, 1800), 6.33, 0.34, -0.05)
for at, g in [(6.42, 0.12), (6.58, 0.06)]:
    nn = S(0.35); tt = np.arange(nn) / SR
    ring = sum(np.sin(2 * np.pi * fr * tt) * np.exp(-tt / dd) for fr, dd in [(2140, 0.09), (3390, 0.06), (5230, 0.04), (7100, 0.03)])
    add(ring + bp(noise(nn), 3000, 9000) * np.exp(-tt / 0.008), at, g, 0.4)

# the counter collapsing: ticks accelerating, then a bright "ding" when it lands on 1
tick_t, tt0 = [], T_EVENT + 0.02
while tt0 < 7.68:
    tick_t.append(tt0); tt0 += max(0.035, 0.11 * (1 - (tt0 - T_EVENT) / 1.7) + 0.035)
for at in tick_t:
    nn = S(0.02); tt = np.arange(nn) / SR
    add(np.sin(2 * np.pi * 2800 * tt) * np.exp(-tt / 0.004), at, 0.06, -0.6)
nn = S(1.6); tt = np.arange(nn) / SR
ding = sum(a * np.sin(2 * np.pi * fr * tt) * np.exp(-tt / dd) for fr, a, dd in [(1318.5, 1, 0.6), (2637, 0.4, 0.3), (3955, 0.15, 0.15), (659.3, 0.3, 0.8)])
add(ding, 7.7, 0.13, -0.5)

# eerie low drone from the event on (very quiet), swelling under the stare
dr = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t + 1) + 0.3 * np.sin(2 * np.pi * 110.6 * t + 2))
dr = lp(dr * (1 + 0.2 * np.sin(2 * np.pi * 0.13 * t)), 300)
dg = 0.045 * smooth(T_EVENT, 9, t) * (1 - 0.5 * smooth(13, 15, t)) + 0.05 * smooth(24.4, 29.5, t)
dg *= 1 - smooth(30.0, 30.05, t) * 0.7
dg = np.where(t < 2.2, 0.05, dg)
dg *= 1 - smooth(35.4, 36.5, t)
L += dr * dg; R += dr * dg

# grill: sizzle that turns to a hiss + crackle once nobody is minding it
burn = smooth(T_EVENT + 0.5, T_EVENT + 7, t)
sizzle = bp(noise(N), 3000, 8500) * (0.5 + 0.5 * np.abs(lp(noise(N), 8)) * 4)
pops = np.zeros(N); pi = rng.integers(0, N, 1400); pops[pi] = rng.uniform(-1, 1, 1400)
pops = bp(pops, 1200, 7000) * 6
grill_lvl = shot_gain({'cold': 0.008, 'pov1': 0.012, 'volley': 0.006, 'couple': 0.012, 'grill': 0.05,
                       'jetski': 0.0, 'tower': 0.0, 'wide': 0.015, 'overhead': 0.01, 'pov2': 0.012})
gs = (sizzle + pops * (0.3 + 0.7 * burn)) * grill_lvl * (0.6 + 0.9 * burn)
L += gs * 0.8; R += gs

# jet ski: engine buzz, louder the closer it is to the camera; dies on the sand
def cam_pos(sec):
    if sec < 2.2: return np.array([0.5, 14, -11.0])
    if sec < 7.7 or sec >= 30: return np.array([0, 0.86, 0.0])
    if sec < 10.4: return np.array([1.7, 0.6, 14.5])
    if sec < 13.0: return np.array([1.0, 0.8, 10.0])
    if sec < 15.6: return np.array([0.8, 1.25, 6.9])
    if sec < 18.6: return np.array([11.2, 1.0, 21.8])
    if sec < 21.4: return np.array([-5.5, 2.0, 29.2])
    if sec < 24.4: return np.array([7.0, 1.6, -1.2])
    return np.array([1.0, 20, -8])

def js_pos(sec):
    if sec < JS_BEACH: return np.array([6.5 + np.sin(min(sec, T_EVENT) * 0.9) * 1.6, 0.3, 150 - 7.2 * sec])
    u = sec - JS_BEACH
    return np.array([7.5, 0.3, 31 - 4.2 * (1 - np.exp(-u * 2))])

ctl = np.arange(0, DUR, 0.01)
dist = np.array([np.linalg.norm(js_pos(s) - cam_pos(s)) for s in ctl])
amp_c = 1 / (1 + (dist / 7) ** 1.3)
rpm_c = np.where(ctl < JS_BEACH, 1.0, np.exp(-(ctl - JS_BEACH) * 2.5))
rpm_c = rpm_c * (1 + 0.04 * np.sin(ctl * 3.1))
amp = np.interp(t, ctl, amp_c); rpm = np.interp(t, ctl, rpm_c)
f_eng = 62 * (0.35 + 0.65 * rpm)
ph = 2 * np.pi * np.cumsum(f_eng) / SR
eng = signal.sawtooth(ph) * 0.6 + signal.sawtooth(ph * 2.01) * 0.3 + bp(noise(N), 300, 1800) * 0.35
eng = lp(eng, 2200) * (1 + 0.3 * np.sin(ph * 0.25))
alive = np.clip(rpm - 0.05, 0, 1)
water = bp(noise(N), 600, 4000) * np.where(t < JS_BEACH, 1, 0)
eng_mix = (eng * alive + water * 0.5) * amp * 0.5
pan_js = np.interp(t, ctl, np.clip([(js_pos(s)[0] - cam_pos(s)[0]) / 12 for s in ctl], -0.8, 0.8))
L += eng_mix * np.sqrt((1 + pan_js) / 2); R += eng_mix * np.sqrt((1 - pan_js) / 2)
# hull into the shallows, then a long scrape up the sand
add(thud(70, 0.5, 0.8, 900), JS_BEACH, 0.5, -0.2)
nn = S(0.9); tt = np.arange(nn) / SR
scrape = bp(noise(nn), 400, 3000) * np.exp(-tt / 0.35) * (1 + 0.5 * np.sin(2 * np.pi * 37 * tt))
add(scrape, JS_BEACH + 0.05, 0.28, -0.2)
nn = S(1.2); tt = np.arange(nn) / SR
add(bp(noise(nn), 1500, 8000) * np.minimum(1, tt / 0.02) * np.exp(-tt / 0.3), JS_BEACH, 0.22, 0.1)   # splash

# lifeguard tower: wind and the flag snapping
wind = lp(noise(N), 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))
flap = bp(noise(N), 500, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 0.7 * t))))
tw = shot_gain({'tower': 1.0})
L += (wind * 0.10 + flap * 0.05) * tw; R += (np.roll(wind, 300) * 0.10 + flap * 0.04) * tw

# overhead: everyone turns and walks toward you -> footsteps in the sand + riser
steps = np.zeros(N)
r2 = np.random.default_rng(99)
for k in range(260):
    at = r2.uniform(25.2, 31.5)
    nn = S(0.12); tt = np.arange(nn) / SR
    st = bp(noise(nn, r2), 300, 2500) * np.exp(-tt / 0.03) + lp(noise(nn, r2), 200) * np.exp(-tt / 0.02)
    i = S(at); steps[i:i + nn] += st[:N - i] * r2.uniform(0.4, 1.0)
step_lvl = shot_gain({'overhead': 0.05, 'pov2': 0.08}) * (1 - smooth(31.5, 33.5, t))
L += steps * step_lvl; R += np.roll(steps, S(0.007)) * step_lvl
riser = bp(noise(N), 800, 6000) * smooth(24.4, 29.95, t) ** 2 * (t < 30.0)
f_r = 200 + 500 * smooth(24.4, 30, t)
riser_t = np.sin(2 * np.pi * np.cumsum(f_r) / SR) * smooth(25, 29.95, t) ** 2 * (t < 30.0)
L += riser * 0.07 + riser_t * 0.03; R += riser * 0.07 + riser_t * 0.03

# POV stare: heartbeat (lub-dub), quickening slightly
hb_t, x = [], 30.15
while x < 35.6:
    hb_t.append(x); x += 60 / (68 + 14 * (x - 30) / 5.5)
for at in hb_t:
    add(thud(52, 0.22, 0.1, 400), at, 0.55)
    add(thud(48, 0.18, 0.05, 400), at + 0.16, 0.35)

# title card hit, hard cut to calm, end-card impact + soft pad
def boom(g, at):
    nn = S(1.2); tt = np.arange(nn) / SR
    b = np.sin(2 * np.pi * (60 * np.exp(-tt * 1.5) + 35) * tt) * np.exp(-tt / 0.35)
    add(b + lp(noise(nn), 200) * np.exp(-tt / 0.05) * 0.6, at, g)
boom(0.5, 0.0); boom(0.35, 2.2); boom(0.45, 35.4)
pad = sum(np.sin(2 * np.pi * fr * t + k) for k, fr in enumerate([220, 277.2, 329.6, 440]))
pad = lp(pad, 1200) * 0.018 * smooth(35.6, 37.5, t) * (1 - smooth(40.2, 41.4, t))
L += pad; R += pad

# a little whoosh on the hard cuts so the edit breathes
nn = S(0.35); tt = np.arange(nn) / SR
wh = bp(noise(nn), 600, 5000) * np.sin(np.pi * np.minimum(1, tt / 0.35)) ** 2
for c in [7.7, 10.4, 13.0, 15.6, 18.6, 21.4, 24.4]:
    add(wh, c - 0.18, 0.05, 0.0)

# ---------------------------------------------------------------- master
mix = np.stack([L, R], 1)
mix = signal.sosfilt(signal.butter(1, 30, 'highpass', fs=SR, output='sos'), mix, axis=0)
fade = np.ones(N); fade[-S(1.0):] = np.linspace(1, 0, S(1.0)); mix *= fade[:, None]
peak = np.max(np.abs(mix)); mix = np.tanh(mix / peak * 2.4) / np.tanh(2.4) * 0.89
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'sfx.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s', 'peak', round(float(np.max(np.abs(mix))), 3))
