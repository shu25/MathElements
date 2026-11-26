# Formula Playground

A native Rust physics toy about numbers. No browser, HTML, WebView, Electron, levels, or tutorial.

Numbers are physical objects. Throw them into each other to add them, collide opposites to erase them,
and place attraction, repulsion, or orbit fields to build unstable little mathematical machines.

## Play

- Drag and release: throw a number
- `Tab`: switch between Algebra, Fields, and Calculus palettes
- `1`–`9`: choose a value
- NUMBER: create and throw numbers
- ATTRACT: place an attraction field
- REPEL: place a repulsion field
- ORBIT: place a spinning field
- COMPLEX: throw complex-number particles
- FACTOR: split a number into prime factors
- SYMMETRY: mirror the current universe
- MATRIX: rotate velocity vectors by a matrix transform
- PORTAL: connect two regions topologically
- d/dt and INTEGRAL: accelerate or accumulate motion
- RANDOM: emit a probability distribution of particles
- FOURIER: create a travelling wave field
- CHARGE: apply value-dependent electric forces
- ERASE: remove objects or fields
- `Space`: freeze/unfreeze time
- `R`: create a new universe
- `C`: clear the universe

Fast collisions combine values. Equal and opposite totals annihilate in a burst.

## Build

```powershell
cargo run --release
cargo build --release
```

The Steam-ready executable is generated at `target/release/formula-playground.exe`.

The previous web prototype is preserved under `legacy-web/` and is not part of the Rust build.
