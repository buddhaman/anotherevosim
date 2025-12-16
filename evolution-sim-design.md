## What the App Is

A **2D browser-based evolution sandbox** where simple creatures evolve their bodies and behavior over time.
Users watch populations change, observe emergent movement strategies, and later explore how creatures evolved.

The app is **interactive but observational first**: you let evolution run, then inspect the results.

Everything runs **entirely in the browser** and can be **shared online**.

---

## Core Idea (v1)

* Creatures live in a **top-down 2D world**
* They have **one main body** with **attached body parts**
* They move by **modulating friction** of their body parts against the ground
  (this produces crawling / walking behavior)
* Each creature has a **fixed-size GRU brain**
* Evolution happens through **mutation + selection**
* All behavior emerges from physics + brain, not scripts

This is not a game you “play”, but a system you **observe, tweak, and study**.

---

## Technology (Only What Matters)

* **Language:** TypeScript
* **Physics:** Planck.js (2D physics with joints)
* **Rendering:** PixiJS
* **Runs fully client-side**
* **Shareable via links** (creatures and ecosystems)

No backend simulation. No servers required to run evolution.

---

## Creature Model (Conceptual)

* One **core body**
* Multiple **attached parts**
* Joints connect parts
* Each body part has:

  * mass
  * size
  * friction

Movement emerges by **changing friction values over time**, driven by the brain.

---

## Brain (Initial Version)

* **Single fixed-size GRU**
* Same brain size for all creatures
* No topology evolution in v1
* Brain inputs: basic body + environment signals
* Brain outputs: control signals that affect joints and friction

---

## Genome (Initial Version)

* Genome is a **flat list of int8 values**
* Interpreted as:

  * body parameters
  * joint parameters
  * brain weights
* Mutation = small changes to these values

Simple, compact, fast to mutate.

---

## Evolution Mechanics (v1)

* **Asexual reproduction only**
* Creatures reproduce when conditions are met
* Offspring = mutated copy
* Creatures die if they fail to survive in the environment

Selection is implicit:
**if it moves better, it survives longer, and reproduces more.**

---

## User Interaction (v1)

* Watch the simulation
* Pause / resume
* Change hyperparameters:

  * mutation rate
  * population limits
  * physics parameters
  * environment settings

No deep inspection tools yet.

---

## What Comes Later (Roadmap)

### Short-Term

* Lineage tree
* Creature ancestry playback
* Inspect mutations over generations

### Medium-Term

* Better visualization tools
* Comparing ancestors vs descendants
* Saving and sharing individual creatures

### Long-Term

* Multiple brain types
* Sexual reproduction
* More complex environments
* Community sharing of ecosystems
* Advanced analysis tools

# BODY DESIGN

## Body Model: Recursive Articulated Rectangles

### Core Principle

A creature’s body is a **tree of rigid rectangular segments** connected by **revolute joints**.
There is **one root segment** (the main body). All other segments are **attached recursively** to existing segments.

This allows bodies to become **arbitrarily complex** while remaining structurally simple.

---

## Segments

* Every body part is a **rectangle**
* Rectangles exist in a **2D top-down world**
* Each segment has:

  * width and height
  * mass
  * base friction coefficient

No special shapes, no sprites—just rectangles.

---

## Attachment Model (Critical Part)

Each child segment is attached to a **specific location on its parent**.

The attachment is defined by:

1. **Which side of the parent rectangle**

   * top
   * bottom
   * left
   * right

2. **Where along that side**

   * expressed as a **fraction from 0.0 to 1.0**
   * 0.0 = one corner
   * 1.0 = the other corner

This gives a **continuous attachment space**, not just corners or centers.

Example (conceptually):

* “Attach this limb to the left side of the parent, 30% from the top.”

This is essential for:

* asymmetry
* non-grid-like bodies
* emergent structure

---

## Recursive Structure

* Any segment can have **zero or more children**
* Children can themselves have children
* This forms a **tree**, not a graph (no loops)

This recursive structure is what allows:

* limbs on limbs
* branching bodies
* growth in depth and complexity

---

## Joints

Every parent–child connection creates a **revolute joint**.

Each joint defines:

* **Minimum angle**
* **Maximum angle**
* **Maximum torque** (how strongly it can rotate)

The joint:

* constrains relative rotation
* can be actively driven by the brain
* enforces anatomical limits

This prevents impossible or unstable body configurations.

---

## Movement Mechanism (Key Design Choice)

Creatures do **not** move by applying linear forces.

Instead, they move by:

1. Applying **rotational torque** at joints
2. Dynamically **changing friction** of individual body parts

By increasing or decreasing friction at the right time:

* parts can “grip” or “slip”
* coordinated motion emerges
* walking and crawling appear naturally

This makes locomotion:

* physically grounded
* emergent
* dependent on timing and structure

---

## Genome Responsibility (Conceptually)

The genome encodes:

* Body structure:

  * how many segments
  * parent–child relationships
  * attachment side
  * attachment position (fraction)
* Joint constraints:

  * min angle
  * max angle
  * torque strength
* Segment properties:

  * size
  * base friction
* Brain parameters (handled separately)

There is **no hard limit** on body complexity except global constraints you choose.

---

## Why This Model

This approach is chosen because it:

* Is directly inspired by **Karl Sims–style evolving morphology**
* Is simple enough to simulate efficiently in 2D
* Supports **arbitrary complexity**
* Encourages emergent, non-human-like solutions
* Works naturally with physics-based evolution

---

For now, **rectangles + revolute joints + friction control** is sufficient—and powerful.
1. Create the minimal modern React + TypeScript project (Vite)

* `npm create vite@latest evo-sim -- --template react-ts`
* `cd evo-sim`
* `npm install`
* `npm run dev` ([vitejs][1])

2. Add Planck physics (TypeScript-friendly)

* Install **Planck** from npm (current maintained package name is `planck`, not “plunk”):

  * `npm i planck` ([npm][2])
    (Alternative older name exists: `planck-js`, but `planck` is the current package line with recent releases.) ([cdnjs][3])

3. Keep dependencies minimal by separating responsibilities

* React: UI only (buttons, sliders, inspectors).
* Custom renderer: one `<canvas>` (or WebGL later), entirely yours.
* Simulation loop: runs on `requestAnimationFrame` (or fixed-step loop driven by it). ([MDN Web Docs][4])

4. Add a “canvas host” React component (structure, not code)

* A single component that:

  * mounts a `<canvas>`
  * starts/stops the sim loop
  * forwards UI hyperparameter changes into the sim (without re-rendering every frame)

Key rule for minimal overhead: **don’t store per-frame sim state in React state**; React state is for UI settings, not positions/frames.

5. Rendering approach that contrasts with PixiJS (but stays minimal)

* Do not add PixiJS.
* Render directly to Canvas2D (simplest) or WebGL (later).
* Your “renderer” is just a module that consumes world state each frame and draws.

6. TypeScript setup (keep default Vite settings)

* Stay with Vite’s defaults initially.
* Only add lint/format tooling if you actually feel pain later (avoid template bloat). ([vitejs][1])

7. Sanity check (first milestone)

* In the browser:

  * Planck world steps deterministically
  * a few rectangles + revolute joints simulate
  * your renderer draws them
  * React sliders change a few hyperparameters live

This is the modern minimal baseline: **Vite + React TS + Planck + custom canvas renderer**. ([vitejs][1])

[1]: https://vite.dev/guide/?utm_source=chatgpt.com "Getting Started"
[2]: https://www.npmjs.com/package/planck?activeTab=code&utm_source=chatgpt.com "planck"
[3]: https://cdnjs.com/libraries/planck-js?utm_source=chatgpt.com "planck-js - Libraries - cdnjs - The #1 free and open source ..."
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame?utm_source=chatgpt.com "Window: requestAnimationFrame() method - Web APIs | MDN"
