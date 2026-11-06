# What if you could see how much money everyone has?

A 61-second 9:16 comedy short. One morning Sam wakes up and every person has a glowing number floating
over their head: their net worth, live. Built with the same engine as [`../nose-grew`](../nose-grew): a
deterministic three.js scene that is a pure function of film time, an HTML HUD, a synthesized
soundtrack, and frame-exact offline export.

**The finished video:** [`what-if-you-could-see-everyones-money.mp4`](what-if-you-could-see-everyones-money.mp4) (1080×1920, 30 fps, with sound).

| Time | Scene | Gag |
|---|---|---|
| 0–2 | city street | cold open: a billionaire, his bodyguards and a crowd, all with numbers |
| 2–8 | bathroom mirror | Sam's own number appears ($1,240.18); he tries to swat it away |
| 8–15 | café | coffee costs −$6.50 live; the man in the suit is −$48,210; the hoodie on the sofa has $2.4M |
| 15–22 | street | the influencer's sports car is leased (−$291,400); the dog has $0.00 and is the happiest one there |
| 22–29 | first date | both glance at each other's numbers; she has $3.8M and picks up the bill |
| 29–35 | grandma's | Grandma Rose, knitting, has $11.4M ("bought stock in 1974") |
| 35–42 | street | a billionaire walks past; his number climbs every second while everyone films |
| 42–48 | kitchen | payday +$2,150 (dance), rent −$1,600 the same day (slump) |
| 48–55 | sunset party | everyone's numbers are wildly different; one by one the tags fade out because nobody cares |
| 55–61 | end card | in 2022 the median U.S. family net worth was about $192,900 (Federal Reserve SCF) |

The HUD tracks **YOUR NUMBER** (Sam's balance, flashing on every transaction) and **RICHEST IN VIEW**,
computed from whichever tags are actually on screen.

Most numbers in the story are made up. The billionaire's +$634 per second is an illustration, not
any real person. The end card figure is the real 2022 Survey of Consumer Finances median.

## Files

```
js/cues.js     timeline: scenes, Sam's transactions, captions, sound cues
js/story.js    the cast, what they do in each scene, money tags, camera shots
js/rig.js      procedural people (+ glasses, hoodie, headphones, bun) and the dog
js/sets.js     rooms shared with the nose video, plus the city street
js/main.js     renderer, lighting, camera, HUD (tags, counter, captions, end card)
tools/         shoot.mjs (stills), sheet.mjs (contact sheet), audio.mjs (soundtrack), export.mjs (MP4)
```

## Rebuild

```bash
node tools/audio.mjs
node tools/export.mjs --fps=30 --workers=3 --out=what-if-you-could-see-everyones-money.mp4
```
