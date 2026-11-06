# What if every man disappeared except you? (beach)

Kick-off prompt for the disaster-animation skill. Paste it into Claude Code in an empty folder.

---

> Build a ~60 second 9:16 animation: **What if every man on Earth disappeared — except you?**
>
> Use the disaster-animation skill. Before anything else, stand up the headless preview
> harness and render one frame so we can both see what we're doing. Then build in the skill's
> order: field, world, physics, people, sky/lighting, direction.
>
> **Setting.** A busy public beach on a hot summer afternoon. Sand out to the waterline,
> rolling surf, a boardwalk with snack stands behind, a lifeguard tower, umbrellas and towels,
> a volleyball net, a jet ski and a couple of boats offshore. Build the beach out to the
> horizon in both directions so no shot runs into a void. Sun high and slightly behind the
> camera, warm graded light, physically based sky with IBL baked from it.
>
> **People.** Around 40 procedural figures of mixed ages, heights and skin tones, all adults
> or families. The women are in bikinis and one-piece swimsuits in varied bright colours,
> the men in board shorts. Everyone is doing something: volleyball, sunbathing, building a
> sandcastle, surfing, carrying a cooler, buying ice cream, a lifeguard on the tower, a guy
> grilling, a guy driving the jet ski. Keep the camera at a natural eye-level beach-goer's
> point of view — no lingering or body-focused shots; the story is the disappearance.
>
> **"You".** POV camera, first person, sitting on a towel. Show your own hands and feet in
> frame at the start so it's clear you're a man and you're still here.
>
> **The event.** At ~6s every man disappears at the same instant, mid-action. Not a fade —
> each one dissolves into a short burst of sand-coloured particles in the shape of his body,
> and whatever he was holding obeys physics: the volleyball drops, the cooler hits the sand,
> the spatula clatters off the grill, the driverless jet ski keeps going and beaches itself,
> board shorts are gone with him. The lifeguard tower is suddenly empty.
>
> **Reaction beats** (cut every 1.5–3s, alternating wide / close / ground level / overhead):
> 1. The volleyball game freezes — the women on one side of the net look at each other.
> 2. A woman turns to talk to the man next to her and he's just gone.
> 3. The grill starts smoking with no one at it.
> 4. The jet ski ploughs into the shallows.
> 5. Overhead shot: the whole beach, every remaining figure slowly turning to look in one
>    direction — at you, the only man left.
> 6. Back to POV: you look down at your own hands, then up. Everyone is staring.
>
> **HUD.** Top-left counter, inset `left: 6%`, band at `top: 13%`: eyebrow `MEN ON EARTH`,
> big serif number, grey sub-line `and falling`. It should read the real ~4 billion figure
> before the event and drop to **1** at the moment of disappearance, ticking down fast rather
> than snapping, and turn accent colour when it lands on 1. Compute it from film time.
>
> **Title card.** Cold-open on the overhead "everyone turns to look at you" beat with the
> title over it for 0–2.2s, then hard-cut back to the calm beach with a timestamp. Eyebrow
> `WHAT IF`, serif line `every man disappeared`, accent payoff line `except you?`.
>
> **Captions.** Short, present tense, one roughly every 3 seconds, italic serif, cream, with
> one or two words highlighted. Light and funny in tone, e.g. "3:12 PM. Just a normal day."
> / "Then — every man. Gone." / "The jet ski didn't get the memo." / "You are now the
> lifeguard." / "Everyone is looking at you."
>
> **End card.** Hold 4–6s. One real, checkable fact about the global male/female population
> split with the source named (look it up from the UN World Population Prospects — do not
> invent the number), then a comment prompt: "What's the first thing you'd do?"
>
> Render two or three frames after every meaningful change and read them back to me. Don't
> stack two unverified stages. Every HUD property is a pure function of film time — no CSS
> transitions or animations.
