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
