# What if you could see how much money everyone has?

A ~61-second 9:16 "what if" video built with the `disaster-animation` skill. Instead of a
storm, the "field" is a **reveal wave**: a golden ring spreads out across a city street from
the first person whose number appears. Every head it passes gets its net worth floating over
it.

The counters at the top read live from the simulation. `PEOPLE`, `MEDIAN` and `AVERAGE` are
calculated from the numbers currently on screen, and the captions quote the same calculated
figures.

## The story beats

| Time | Beat |
|---|---|
| 0–2.6 s | Cold open: flash-forward to the crowd staring at a $3,400,000,000 label. Title. |
| 2.6–10 s | 8:14 AM commute. One number appears above one woman ($58,300). |
| 10–18 s | The wave runs down the avenue. "Everything they own, minus everything they owe." |
| 18–30 s | Close-ups: a student in the red, a sharp suit in the red, a frugal retiree with $1.24M. |
| 30–34 s | The median of this street sits around $185k–$190k. |
| 34–42 s | A billionaire steps out of a black car. The average jumps to ~$19M; the median barely moves. |
| 42–52 s | Everyone stops and stares; the camera rises over a whole avenue of numbers. |
| 52–61 s | "Would you treat people differently?" End card with the real Fed numbers. |

The crowd's net worth follows the shape of U.S. family net worth in the Federal Reserve's
**2022 Survey of Consumer Finances** (median $192,900, mean $1,063,700). The end card quotes
those two figures; everything else on screen is a simulation.

## Commands

```bash
cd tools && npm install && cd ..           # puppeteer-core for the harness
node tools/shoot.mjs 1 12 20 36 49 58      # preview stills -> tools/shots/
node tools/export.mjs --fps=30             # 1080x1920 MP4 -> tools/out/
# no GPU (e.g. a cloud container): software rendering at 1x pixel ratio, ~1 s/frame
node tools/export.mjs --gpu=0 --q=pr=1 --fps=30
```

Open `index.html` in Chrome to watch it play (`?t=30` starts at 30 s).

## Files

| File | What it does |
|---|---|
| `js/field.js` | Story time, the reveal wave, the cast and their paths (pure functions of time), the net-worth distribution, live median/average |
| `js/world.js` | Avenue, sidewalks, crosswalk, facades and storefronts, trees, lamps, parked cars, the billionaire's car, the reveal ring |
| `js/people.js` | The crowd as instanced body parts, with walk cycles and the turn-to-stare; clears the line of sight in close-ups |
| `js/labels.js` | The number over each head: HTML projected from 3D, with count-up, pop, colour by sign and size |
| `js/director.js` | 14 shots, 25 captions, counters, title and end card |
| `js/main.js` | Renderer, sky and sun, `?shot=` / `?render=` modes |

Fonts: Playfair Display and Inter (SIL Open Font License), vendored in `lib/fonts/`.
