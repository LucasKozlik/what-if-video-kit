# What if there were no bugs on the planet?

A 61-second 9:16 "what if" video built with the `disaster-animation` skill. Here the "disaster"
is not a force. It is an ecosystem losing its insects. The `field.js` here is a timeline of
ecosystem state (insects, flowers, birds, litter, greenness, colour grade), and every visual reads
from it.

## The cut

| Time | Beat |
|---|---|
| 0–2.6 | **Cold open on the aftermath**: a brown, silent valley with the title over it |
| 2.6–6.6 | Today: a close-up of a daisy with bees, then the meadow with swallows. "About 10 quintillion insects are alive" |
| 6.6–8.8 | **The vanishing**: each bee, butterfly and midge blinks out in its own spark |
| 8.8–17.6 | Day 1 to week 2: silence, and flowers nobody visits |
| 17.6–23.6 | The songbirds thin out (most feed insects to their chicks) |
| 23.6–29.6 | Dung and dead leaves pile up. Australia's dung beetle story |
| 29.6–38.6 | Next spring the orchard blooms, the blossom falls, and no fruit sets |
| 38.6–44.6 | Wind-pollinated wheat survives, but 3 in 4 leading crops need pollinators |
| 44.6–56 | Year 2: the meadow is brown, and the E. O. Wilson warning |
| 56–61 | End card: Germany's 76% flying-insect decline (Hallmann et al., 2017) |

HUD counters (top left): days without insects, insects alive, songbirds left, wildflowers.
All of them read from the simulation state.

## Facts used and their sources

- About 10 quintillion (10^19) insects alive at any time. This is the Smithsonian's estimate.
- Nearly 9 in 10 flowering plants are animal-pollinated (Ollerton, Winfree & Tarrant, *Oikos*, 2011: ~87.5%).
- 3 in 4 leading global food crops depend at least partly on animal pollination (Klein et al., *Proc. R. Soc. B*, 2007: 87 of 115).
- The Australian Dung Beetle Project (1965–1985) imported dung beetles because cattle pats persisted on pastures.
- E. O. Wilson wrote that if insects and other land arthropods disappeared, "humanity probably could not last more than a few months" (*The Diversity of Life*, 1992).
- Flying insect biomass in German protected areas fell by 76% over 27 years (Hallmann et al., *PLOS ONE*, 2017).

## Run it

```bash
cd tools && npm install && cd ..
node tools/shoot.mjs 3.5 7.8 34          # preview stills -> tools/shots/
bash tools/export-parallel.sh 4 30       # full 1080x1920 30fps, rendered in 4 parallel segments
node tools/soundtrack.mjs                # synthesized soundtrack -> tools/out/soundtrack.wav
ffmpeg -i tools/out/video_silent.mp4 -i tools/out/soundtrack.wav -c:v copy -c:a aac -b:a 192k -shortest no-bugs.mp4
```

Or open `index.html` in Chrome to watch it play. The page itself has no sound. The audio
comes from the offline soundtrack.
