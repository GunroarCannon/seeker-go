# Modular Arcade Engine – Gap Analysis & Implementation Plan

## What needs to happen

`index.html` boots a Phaser 3 engine by importing two ES modules:

```
./src/parser/SchemaParser.js
./src/systems/GameBootstrapper.js
```

Neither path exists yet. The parser files live in `/parser/` (flat), not `/src/parser/`. Several files referenced by the parsers are missing entirely. Nothing runs.

---

## Gap Inventory

| Status | File | Issue |
|--------|------|-------|
| ✅ Exists | `parser/SchemaParser.js` | Wrong path (`/parser/` vs `/src/parser/`) |
| ✅ Exists | `parser/EntityResolver.js` | Wrong path |
| ✅ Exists | `parser/MicrochipResolver.js` | Wrong path |
| ✅ Exists | `parser/HudRenderer.js` | Wrong path |
| ✅ Exists | `parser/ParticleManager.js` | Wrong path |
| ❌ Missing | `src/parser/LevelResolver.js` | Imported by SchemaParser, never created |
| ❌ Missing | `src/parser/UIResolver.js` | Imported by SchemaParser, never created |
| ❌ Missing | `src/systems/GameBootstrapper.js` | Imported by index.html, never created |
| ❌ Missing | `src/systems/LevelScene.js` | Referenced in GameBootstrapper comment |
| ❌ Missing | `src/systems/ActionExecutor.js` | Referenced in HudRenderer, needed for button actions & microchips |

---

## Proposed Changes

### 1 – Copy/migrate parser files → `src/parser/`

Copy all existing parser files into `src/parser/` (their imports already use relative paths that work if they're all in the same directory).

#### [NEW] `src/parser/SchemaParser.js` (copy from `parser/`)
#### [NEW] `src/parser/EntityResolver.js` (copy from `parser/`)
#### [NEW] `src/parser/MicrochipResolver.js` (copy from `parser/`)
#### [NEW] `src/parser/HudRenderer.js` (copy from `parser/`)
#### [NEW] `src/parser/ParticleManager.js` (copy from `parser/`)

---

### 2 – Create missing parser sub-modules

#### [NEW] `src/parser/LevelResolver.js`
- Validates and normalises every level definition.
- Resolves `entities[]` — each entry becomes a fully instantiated entity (template + metadataOverride + microchipsOverride).
- Resolves `events[]` — each timed event normalised with actions.
- Resolves `goals[]` and `failureConditions[]` (built-in types + `customCheck`).
- Normalises `teachingMoment` (text + displayTime).

#### [NEW] `src/parser/UIResolver.js`
- Validates and normalises the `world.ui` block.
- Returns `{ hud: [...], menus: { gameOver, levelComplete, pause } }`.
- Each UI element normalised with defaults (pos, size, font, color, binding, etc.).

---

### 3 – Create runtime systems

#### [NEW] `src/systems/ActionExecutor.js`
Central dispatcher for all built-in actions (`destroy`, `spawnEntity`, `spawnParticles`, `playSound`, `restartLevel`, `nextLevel`, etc.) and `customAction` strings. Used by LevelScene (triggered by microchips, events, buttons).

#### [NEW] `src/systems/LevelScene.js`
A `Phaser.Scene` subclass that:
- Receives a `gameDef` + `levelIndex` via scene `data`.
- Renders all entity instances using their `shapePrimitives` onto a Phaser `Graphics` object.
- Runs the microchip game loop: `on-update` every frame, `on-timer` by accumulation, `on-click` via pointer events, `on-collide` via simple AABB overlap checks.
- Runs level `events` by tracking elapsed time.
- Evaluates `goals` and `failureConditions` each frame — on trigger, shows the appropriate HUD menu.
- Uses `HudRenderer` for the HUD + menus.
- Uses `ParticleManager` for particle bursts.
- Uses `ActionExecutor` for all built-in + custom actions.
- Shows the `teachingMoment` as an overlay at level start.
- Handles spawning of `waterDrop` entities (and any `spawnEntity` actions).

#### [NEW] `src/systems/GameBootstrapper.js`
- Receives `gameDef` and a container element id.
- Creates a `Phaser.Game` instance sized to `cameraBounds` (800×600).
- Adds a `LevelScene` for each level in `gameDef.levels`.
- Starts the first scene.

---

## File Tree After Changes

```
gameLM/
├── index.html          (unchanged)
├── example.json        (unchanged)
├── Readme.md           (unchanged)
├── parser/             (original stubs – kept for reference)
└── src/
    ├── parser/
    │   ├── SchemaParser.js
    │   ├── EntityResolver.js
    │   ├── MicrochipResolver.js
    │   ├── LevelResolver.js        ← NEW
    │   ├── UIResolver.js           ← NEW
    │   ├── HudRenderer.js
    │   └── ParticleManager.js
    └── systems/
        ├── ActionExecutor.js       ← NEW
        ├── LevelScene.js           ← NEW
        └── GameBootstrapper.js     ← NEW
```

---

## Scope Notes

- **No physics engine** (Matter.js etc.) needed — `example.json` sets `gravity:0` and all entities are either `static` or `kinematic`. Physics is simulated manually (AABB overlap for collision, velocity from `customAction`).
- **Sound** won't play if the audio files (e.g. `/audio/rain_soft.mp3`) are missing, but the engine will degrade gracefully.
- **`on-collide`** detection uses simple rect-overlap; enough for this game where drops fall onto crops.

## Verification Plan

Open `index.html` via a local HTTP server. Expected behaviour:
1. Status bar shows "Schema parsed ✓ (1 level(s), 5 entity templates)"
2. Phaser canvas renders: sky background, soil strip, cloud, sun, 3 maize seedlings, water/health bars.
3. Clicking the cloud spawns 5 water drops that fall and raise crop water bars.
4. After 20 s: pest warning text appears, crops 1 & 2 turn yellow (to signal pest).
5. Clicking an infested crop removes pests (particle pop).
6. If all 3 crops reach maturity → "Harvest Time!" overlay.
7. If 2+ crops die → "Crops Failed" overlay with restart button.
