# 蜜線救援 · Honeyline Rescue

An original, dependency-free HTML5 drawing puzzle. Protect the picnic bunnies from bees using a limited supply of fixed magic ink. Built for pointer and touch input, with Traditional Chinese UI.

## Play

https://zuestrd20.github.io/honeyline-rescue/

- Drag to draw one or more barriers, then release the bees.
- Ink stays fixed in place. Terrain also blocks bees. You cannot draw through bunnies, hives, or solid terrain.
- Protect every bunny until the countdown ends. A bee reaching any bunny loses the round.
- Undo, reset, hints, pause, 16 progressively unlocked levels, local progress, and optional synthesized sound (off by default).
- Stars compare your ink usage with the tested reference solution: up to 103% earns three, up to 112% earns two, otherwise one. Every level has an achievable three-star solution.
- Desktop shortcuts: R resets, Ctrl/Cmd+Z undoes; Space while the canvas is focused starts or pauses.

Progress is stored only in browser localStorage. No accounts, analytics, tracking, backend, external fonts, images, or ads.

## Run and test

Serve this folder with any static HTTP server; open index.html through that server. ES modules require HTTP rather than a file URL in most browsers.

`npm test` runs the deterministic engine test suite in Node. No installation or dependencies are required.

GitHub Pages serves main / root. `.nojekyll` keeps the static files unchanged.

## Design

Artwork is original procedural Canvas illustration. The game uses finite static ink barriers rather than falling rigid-body strokes. Simulation uses fixed time steps and collision substeps, not an external physics engine. Level solutions are included for deterministic regression tests and optional visual hints.
