# Pixi.js Editors

This contains several pixi.js-powered editors. Although our app is using React and pixi.js, we're not using `pixi-react`, and instead sync state manually.

## Adding a new editor

Look at the map editor, in `./map/` for a typical editor. First, create a folder in `../editors/`, then create an `init.ts` file which will set up the pixi.js application. Also add a `globals.ts` for global values that need to be shared throughout the editor, and a `constants.ts` for constants.
