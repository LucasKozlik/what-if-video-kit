# What if everyone was geeked?

A 61-second 9:16 comedy "what if" built on the `disaster-animation` engine. The field here is a
single value, `GK.geek` (0..1). It drives how people move, how cars drive, the camera sway, and a
post-process wobble with a hue shift and chromatic split.

## The cut

| Time | Beat |
|---|---|
| 0–2.4 | **Cold open on the climax**: a 40,000-person dance circle. Title, plus the open loop "1 creature on Earth isn't. Can you find it?" |
| 2.4–6 | 8:00 AM, a normal Monday. Meet Kevin. Riser |
| 6–8 | **8:01: everyone on Earth gets geeked**: rainbow flash, dolly zoom, pupils dilate, bass drop |
| 8–35 | The escalation, cutting every ~3 s with zoom punches: walking, 4 mph traffic with 9 crashes, Kevin and his hand, the lamp-post guy, snacks sold out, autopilot at 35,000 ft, markets +900%, the dancing cop, "snacks are kinda fire" |
| 35–41 | The dance circle grows from 1 to 40,000 |
| 41–44 | **Pattern interrupt**: silence, grey, "WAIT." Nobody can drive, not even the ambulances |
| 44–50 | It wears off all at once. Nobody talks about it. Crickets |
| 50–56 | **Payoff of the open loop**: the dog. He saw everything |
| 56–61 | End card: a real drunk-driving fact (NHTSA) plus two comment prompts |

## Attention techniques used

- **Cold open on the payoff**, with the question as the title.
- **An open loop in the first second** ("1 creature isn't geeked, find it"), closed only at 50 s.
- **A cut every 2–3 s**, alternating scale, with zoom punches on punchlines.
- **Escalation** from one person to a street, then the markets, then world leaders, then a 40,000-person crowd.
- **Hyper-specific numbers** (40 minutes, 4 mph, 9 crashes, 11 minutes), which are funnier than vague ones.
- **A hard pattern interrupt** (music, colour and motion all stop) right before the turn.
- **A named character** (Kevin) and a recurring callback.
- **A comment-bait CTA** ("What would YOU do first?" and "Tag the friend who starts the dance circle").

## Run it

```bash
cd tools && npm install && cd ..
node tools/shoot.mjs 7 39.5 54.5          # preview stills -> tools/shots/
bash tools/export-parallel.sh 4 30        # 1080x1920 30fps in 4 parallel segments
node tools/soundtrack.mjs                 # synthesized soundtrack -> tools/out/soundtrack.wav
ffmpeg -i tools/out/video_silent.mp4 -i tools/out/soundtrack.wav -c:v copy -c:a aac -b:a 192k -shortest geeked.mp4
```

The end-card fact: NHTSA reports 13,524 people were killed in alcohol-impaired-driving crashes in
the U.S. in 2022, about one every 39 minutes.
