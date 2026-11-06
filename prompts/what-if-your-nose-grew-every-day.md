# What if your nose grew bigger every day?

A ready-to-paste kickoff prompt for a ~60 second 9:16 "what if" video. Ten days, one luxury
house, one family, and one nose that will not stop. Paste everything in the block below into
Claude Code in an empty folder.

---

> Build a ~60 second 9:16 "what if" animation: **What if your nose grew bigger every day?**
>
> Use the disaster-animation skill. Treat the nose like the giant brief: **the nose IS the
> field.** It is one set of capsules riding the head joint, its length a single function of
> film time, and everything it touches (cups, frames, doorways, chandelier crystals) tests
> against those same capsules. Before anything else, stand up the headless preview harness and
> render one frame of the man in the house so we can both see what we're doing.
>
> **The rule that makes the joke: only his nose grows.** His head, face, body, clothes and
> height stay exactly the same size all ten days. The wife, the kids, the house and every prop
> stay the same size. Nothing else scales, ever. If anything except the nose changes size
> between Day 1 and Day 10, it's a bug.
>
> **The family**
> - **Marcus**, about 40, the dad. Sharp navy suit or cream linen at home, calm and stylish,
>   trying very hard to act like everything is normal.
> - **Elena**, his wife. Elegant, warm, funny. Goes from worried, to laughing, to fully
>   adapting the house around the nose.
> - **Two kids**: **Leo** (8) and **Mia** (5). They think this is the best thing that has ever
>   happened.
>
> Low-poly but expressive: readable faces at phone size, blinks, eyebrows, mouths that react.
> Keep all four in frame together as often as possible so the family is the scale reference.
>
> **The house** — a modern hillside mansion at golden hour. Floor-to-ceiling glass, white
> marble floors, warm oak, a floating staircase, a crystal chandelier, an open kitchen with a
> waterfall-edge island, a long dining table, and a back terrace with an **infinity pool** that
> looks out over city lights. Build it out to the horizon: hills, palms, other houses, the city
> below. No void past the windows. Linear HDR, tone mapped once, warm grade, a physically based
> sky with the low sun streaming through the glass.
>
> **The growth** — the nose gets about 1.8x longer every morning. Compute the length from film
> time and drive the HUD from that same value:
>
> | Day | Length | Day | Length |
> |---|---|---|---|
> | 1 | 5 cm (normal) | 6 | 94 cm |
> | 2 | 9 cm | 7 | 1.7 m |
> | 3 | 16 cm | 8 | 3.1 m |
> | 4 | 29 cm | 9 | 5.5 m |
> | 5 | 52 cm | 10 | 10 m |
>
> Keep its shape his nose all the way, just longer: same skin tone and shading, a slight
> droop under its own weight from Day 6 on, a gentle bob when he walks or turns his head.
>
> **The ten days** (about 5 seconds each, a "DAY X" stamp at every cut)
> 1. **Marble bathroom, morning.** He looks in the mirror. Something is… slightly off. He
>    squints. Normal day.
> 2. **Kitchen breakfast.** Elena tilts her head and stares. His nose dips into his espresso.
> 3. **Front hall.** The kids burst out laughing. His sunglasses no longer reach his ears.
> 4. **Living room.** Elena goes in for a kiss and has to come in from the side. Leo measures
>    it with a tape measure.
> 5. **Hallway.** He turns and the nose knocks a framed photo crooked. He starts walking
>    through doors nose-first, very carefully.
> 6. **Dining table.** Dinner. He rests the nose on the table like a third arm. Mia hangs her
>    napkin on the tip.
> 7. **Staircase.** The nose pokes through the railings of the floating staircase. The
>    chandelier crystals chime as it brushes past. A few fall.
> 8. **Bedroom, night.** He sleeps on his back, the nose out through the open balcony door.
>    Elena has put a little pillow under the end of it.
> 9. **Open-plan living area.** He stands in the kitchen; the tip is in the living room. The
>    kids slide down it onto the sofa. Elena hangs fairy lights along it. They've adapted.
> 10. **The infinity pool, sunset.** He stands on one side of the pool; the 10 m nose reaches
>     all the way across. Elena and the kids sit on it like a bench, feet over the water,
>     city lights below. Pull the camera back into one big wide. Hold.
>
> **HUD**
> - Top-left counter, inset `left: 6%`, band at `top: 13%`: eyebrow **NOSE LENGTH**, a big
>   serif number read straight from the sim (cm, switching to m at 1 m), grey sub-line
>   **DAY 7 OF 10 · +80% A DAY**. Right-hand column in the same flex row: **DAY** big, so the
>   two can never overlap.
> - Title card cold-open: 0–2.2s is Day 10 at the pool with the title over it, then hard-cut
>   to Day 1 in the bathroom with "DAY 1". Title gone by 3.6s.
> - Captions about every 3 seconds, present tense, italic serif, cream, one or two words in the
>   accent colour (warm gold): *"It starts with a **mirror**."* · *"His wife **notices**."* ·
>   *"The kids **love it**."* · *"Doors become a **problem**."* · *"The family **adapts**."*
> - Every HUD property is a pure function of film time. No CSS transitions or animations.
>
> **Camera** — cut every 1.5–3 seconds, alternate wide, close-up on his face, the family's
> reaction shots, and low angles along the nose. The comedy is in the cut to the reaction.
> Keep a doorway, a cup or a kid in frame for scale. Gentle handheld, smooth noise only.
>
> **End card** (hold 4–6s): *"In real life, noses really do look bigger as we age. Skin and
> cartilage lose their stiffness and gravity slowly pulls them longer."* Then: **"Would you
> still love him on Day 10?"**
>
> Build in the skill's order and render two or three frames after every meaningful change.
> Don't stack two unverified stages.
