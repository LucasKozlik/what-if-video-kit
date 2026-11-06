# What if every man disappeared — except you? (beach)

Built from `prompts/what-if-men-disappeared-beach.md` with the disaster-animation skill.
61 s, 9:16, 1080x1920 @ 30 fps.

- Open `index.html` in Chrome to watch it (Space pause, ← → seek, H hide HUD).
- The whole scene is a pure function of film time, so `?shot=12.5` renders any instant.
- `node tools/pw-shoot.mjs 3 6.2 9` — headless stills (Playwright + SwiftShader) into `tools/shots/`.
- `python3 tools/sfx.py` — synthesizes the synced soundtrack + sound effects to `tools/out/sfx.wav`.
- `node tools/pw-export.mjs --w=1080 --fps=30` — frame-exact PNGs into `tools/frames/`; split
  long renders with `--from/--to` and run them in parallel. Encode with ffmpeg (see below).

```
ffmpeg -framerate 30 -i tools/frames/f_%06d.png -i tools/out/sfx.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out.mp4
```

Story beats: cold open on the ending (everyone gathered, staring) under the title → 3:12 PM POV with
your hands and board shorts → 6.0 s every man bursts into sand → the volleyball lob lands on an
empty side → the woman beside the vanished man turns to him → unattended grill smoking → the
driverless jet ski beaches itself → empty lifeguard tower → wide → overhead as the whole beach turns
and walks toward you → POV, hands, then everyone staring → hearts pop over every head → the ring closes → you
bolt for the water and the whole beach chases you along the shoreline → end card.

End-card fact: about 101 men per 100 women worldwide (UN World Population Prospects). The figure
was taken from secondary sources quoting WPP; check it against population.un.org/wpp before posting.
