##

- Faster water movement

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
