# What if your nose grew bigger every day?

A 61-second 9:16 comedy short built from [`prompts/what-if-your-nose-grew-every-day.md`](../../prompts/what-if-your-nose-grew-every-day.md)
with the `disaster-animation` engine conventions: a deterministic three.js scene that is a pure function
of film time, rendered offline frame by frame, with an HTML HUD and a synthesized soundtrack.

**The finished video:** [`what-if-your-nose-grew.mp4`](what-if-your-nose-grew.mp4) (1080×1920, 30 fps, with sound).

## The rule

Only the nose grows. Marcus, Elena, Leo, Mia and the house stay the same size for all ten days.
The nose is ~1.8× longer every morning: 5.0 cm on Day 1 → 1.7 m on Day 7 → 10.0 m on Day 10.
One function, `noseLen(t)` in `js/cues.js`, drives the mesh, the props that touch it and the counter.

| Day | Room | Gag |
|---|---|---|
| 1 | marble bathroom | something is… slightly off in the mirror |
| 2 | kitchen | the nose dips into the espresso (*plip!*) and Marcus goes cross-eyed |
| 3 | front hall | the kids lose it; sunglasses perch on the nose, arms nowhere near his ears |
| 4 | living room | Elena boops into it, kisses him from the side; Leo measures it from a pouf |
| 5 | gallery hallway | a head turn knocks a family photo crooked; doors are now taken nose-first |
| 6 | dining room | the nose rests on the table; Mia hangs her napkin on the tip |
| 7 | floating staircase | it pokes through the railings into the chandelier; crystals rain down |
| 8 | bedroom, night | it arches out the balcony door onto a little pillow; Elena is not asleep |
| 9 | open plan | the kids slide down it onto the sofa; Elena hangs fairy lights on it |
| 10 | infinity pool | ten metres across the water; the family uses it as a bench at sunset |

End card: noses really do look bigger with age (cartilage and skin lose stiffness, gravity pulls the tip
down), then *"Would you still love him on Day 10?"*

## Files

```
index.html, style.css     9:16 stage + HUD (counter, DAY stamp, captions, comic FX words, end card)
js/cues.js                the timeline: day times, nose length, story beats, captions, sound cues
js/rig.js                 procedural people (group hierarchy) and the Nose tube
js/sets.js                the ten rooms, sky dome, painted hillside/city horizon
js/story.js               what everyone does on each day, plus the camera shot list
js/main.js                renderer, lighting per room, camera, HUD, ?shot= / ?render= modes
tools/shoot.mjs           render stills:  node tools/shoot.mjs 9.8 24.2 50.5
tools/sheet.mjs           tile stills into a contact sheet
tools/audio.mjs           synthesize audio/soundtrack.wav from js/cues.js
tools/export.mjs          frame-exact MP4 export (parallel workers) + mux the soundtrack
```

## Rebuild

Needs Node 20+, ffmpeg, and Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`).
three.js r149 is vendored in `lib/`.

```bash
node tools/audio.mjs                                   # audio/soundtrack.wav
node tools/export.mjs --fps=30 --workers=3 --out=what-if-your-nose-grew.mp4
```

Open `index.html` in Chrome to watch it live (Space pause, ← → seek, H hide HUD). Software WebGL in the
container renders at about 2 s/frame; a real GPU is far faster.
