## 0.2.2 -

- v1.4 license to handle CC content, third party assets, and severability
- `host.char.getMoveProps()` to get dynamic movement information of a character.
- Added swimming movement to the `PlayerMovement` controller.
- Placeholder for level publish workflow

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
