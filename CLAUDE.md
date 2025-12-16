# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **2D browser-based evolution sandbox** where simple creatures evolve bodies and behavior over time. Everything runs entirely in the browser with no backend required. The simulation is shareable via links.

Key concept: Creatures are **articulated bodies made of rectangular segments** connected by revolute joints. They move by **modulating friction** and applying torque at joints. Evolution happens through mutation and selection.

## Technology Stack

- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Framework**: React (for controls and UI only, not per-frame rendering)
- **Physics Engine**: Planck.js (2D physics with joints)
- **Rendering**: PixiJS v8 (WebGL renderer)
- **Client-side only**: No backend, all simulation runs in browser

## Architecture Principles

### Separation of Concerns

1. **React**: UI controls only (buttons, sliders, inspectors). Never store per-frame simulation state in React state.
2. **Simulation Loop**: Runs on `requestAnimationFrame`, independent of React render cycle
3. **Renderer**: Custom module that consumes world state each frame and draws to canvas
4. **Physics**: Planck.js world steps deterministically

### State Management

- **React state**: For UI settings and hyperparameters only
- **Simulation state**: Lives outside React, updated in the simulation loop
- UI changes propagate to simulation via callbacks, not by triggering React re-renders every frame

## Creature Model

### Body Structure (Critical)

- Bodies are **trees of rigid rectangular segments** (not a graph - no loops)
- One **root segment** (main body)
- Children attach recursively to parents
- Attachment defined by:
  - **Side** of parent rectangle (top/bottom/left/right)
  - **Position along that side** (0.0 to 1.0 fraction) - this enables asymmetry and non-grid-like bodies

### Joints

- Every parent-child connection is a **revolute joint**
- Each joint has:
  - Min angle
  - Max angle
  - Max torque
- Joints can be actively driven by the brain

### Movement Mechanism

Creatures do NOT move by applying linear forces. Instead:
1. Apply **rotational torque** at joints
2. Dynamically **change friction** of individual body parts

By modulating friction timing, creatures "grip" and "slip" to produce emergent crawling/walking behavior.

### Segment Properties

Each rectangular segment has:
- Width and height
- Mass
- Base friction coefficient

## Brain Model (v1)

- Single fixed-size **GRU** (Gated Recurrent Unit)
- Same brain size for all creatures (no topology evolution in v1)
- Inputs: basic body + environment signals
- Outputs: control signals for joints and friction

## Genome Model

- Flat list of **int8 values**
- Encodes:
  - Body structure (segment count, parent-child relationships, attachment side/position)
  - Joint constraints (angles, torque)
  - Segment properties (size, friction)
  - Brain weights
- Mutation: small changes to these values

## Evolution Mechanics

- **Asexual reproduction only** (v1)
- Offspring = mutated copy of parent
- Selection is implicit: better movers survive longer and reproduce more
- No explicit fitness function

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## PixiJS v8 Critical Information

**IMPORTANT**: PixiJS v8 changed the Graphics API significantly. Always use the new API:

### Application Initialization (Async Required)
```typescript
const app = new Application();
await app.init({ canvas, width, height, backgroundColor: 0x1a1a1a });
```

### Graphics API (v8 Pattern)
```typescript
// Build shape FIRST, then fill/stroke
graphics
  .rect(x, y, width, height)    // or .circle() or .poly([x1,y1,x2,y2,...])
  .fill({ color: 0xff0000, alpha: 0.8 })
  .stroke({ width: 2, color: 0x00ff00 });
```

### Deprecated Methods (DO NOT USE)
- `beginFill()` / `endFill()` - use `.fill()` instead
- `lineStyle()` - use `.stroke()` instead
- `drawRect()` - use `.rect()` instead
- `drawCircle()` - use `.circle()` instead
- `drawPolygon()` - use `.poly()` instead
- `moveTo()` / `lineTo()` - use `.poly()` with coordinate array instead

## Project Setup

Dependencies installed:
- `planck` - 2D physics engine
- `pixi.js` - WebGL/Canvas2D rendering

## Key Design Constraints

1. **Keep dependencies minimal** - only React, Vite, Planck, and TypeScript
2. **No per-frame React updates** - simulation runs independently
3. **Physics-based movement only** - no scripted behaviors
4. **Simple geometry** - rectangles only (no complex shapes or sprites)
5. **Client-side determinism** - simulation must be reproducible

## Future Roadmap Context

Short-term planned features:
- Lineage tree visualization
- Creature ancestry playback
- Mutation inspection over generations

This context helps understand why certain architectural decisions favor extensibility toward lineage tracking and replay systems.
