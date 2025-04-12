## 0.4.1 - 4/12/25

- Fix bad `WORKSPACE_DIR` env var
- Bugfix for bad DIND config
- Use template version instead of engine version when upgrading

## 0.4.0 - 4/11/25

- TwineJs integration for dialogue authoring
- Use engine v0.6.0
- `host.pickup.get(tags)` for querying inventory
- Unify `displaySign` and `displayInteraction` to `display` with animate arg
- `sensorEvent` and `tileCollisionEvent` take `initiator` arg
- 2x WebAssembly compilation speed
- Update all deps
- `logError` and `logWarning` now available
- `host.pickup.get` for checking player's inventory
- Added `host.time.getSunEvent` for current event ("morning", "dusk", etc)
- Added template version to compiled WASM file

## 0.3.3 - 3/26/25

- Faster water movement
- Improve dev canvas layout
- Engine version v0.5.1

## 0.3.2 - 3/20/25

- Reset level script
- Only upgrade level if git working tree and index are clean
- v1.5 license better indemnification, trademarks, and likenesses

## 0.3.1 - 3/20/25

- Bugfix where local devcontainer restart broke vite

## 0.3.0 - 3/19/25

- v1.4 license to handle CC content, third party assets, and severability
- `host.char.getMoveProps()` to get dynamic movement information of a character.
- Added swimming movement to the `PlayerMovement` controller.
- Placeholder for level publish workflow
- `host.time.advanceSunTime`
- `host.time.setSunEvent`

## 0.2.1 - 3/15/25

- Added v1.0 licensing agreement

## 0.2.0 - 3/14/25

- Use engine `0.3.0`
- Use production engine (not qa)
- `setTint` moves to `host.tiles` and called with Tile uid
- `host.tiles.change` now uses Tile uid
- `host.tiles.playAnimation` now uses Tile uid
- Added `host.tiles.getTiles`
- `host.timer.start` now returns a timer uid
- `host.timer.cancel` now takes a timer uid
- `timerEvent` callback takes a timer id
- Removed `userData` from timers

## 0.1.0 - 3/9/25

- Faster reloading of level assets
