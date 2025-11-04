The Get Lost Level template is a local devcontainer application written in primarily Typescript, using React, Redux RTK, and Mantine. The purpose of the app is to provide a browser-based local development environment for producing levels for a 2.5D pixel art game engine called Get Lost.

# Architecture

The architecture is divided into two separate areas: level and internal. Whether or not a user of this repository works in one folder or the other is based on their intentions. Level designers, who simply want to use this repository to develop a level, will stay in the `/level` folder. However, users who want to advance the level editor itself will work in the `/.internal` folder. Some users may wish to develop a level and also add to the level editor itself, in which case they may work in both folders.

## Level

The top-level `/level` folder contains assets (code, images, sound effects) owned by the level developer. These files are what level developers will primarily concern themselves with.

## Internal

The top-level internal `/.internal` folder contains the entire codebase for the editor application. It is prefixed with a dot (technically making it hidden) because it is not intended to be seen or used by level developers.

# Level developers

TODO

# Editor developers

## Entrypoint

`.internal/src/main.ts` is the main entrypoint, which immediately imports `shell.tsx`, which sets up the root react component, wrapped in our various providers. The main "shell" of the app lives in `.internal/src/components/ShellApp.tsx` and this contains the main tabbed interface.

## UI

As previously mentioned, the UI is React + Typescript + Redux RTK + Mantine. We use React Router for url path handling, and it should continue to be used for new paths and assets going forward, where it makes sense. We prefer Tabler icons for icon components.

### Tools

Tool buttons are defined in...

### Layout

The `ShellApp` component contains the main tabbed interface. It also contains a global, fullscreen Mantine `Dropzone` component to handle all asset uploads from any tab. Tab content is deferred until the tab is mounted, but then it persists across tab changes.

### Uploads

### File structure

Generally, react components live in `.internal/src/components` at the top level.

## Asset persistence

Subfolders in `.internal/src/persist` contain the code for saving and loading different assets in our editor. For example, tilesets, the map, the story graph, etc. Primarily, all of these assets will be saved in a CBOR binary format, using `cbor2` (https://www.npmjs.com/package/cbor2). Specifically, the front end sends the CBOR data, and the backend gzips it and saves it to a specific location. On retrieval, the backend sends the gzipped cbor file and lets the browser decompress it, then the front end decodes the CBOR data.

The actual triggering of persistence comes from Redux RTK middleware that watches for specific actions, throttles them, and then triggers the save api call. These middlewares can be found in `.internal/src/store/middleware`.

### Transport

The transport that asset loading and saving uses is a simple local REST http call to the vite development server. The vite plugin that handles these requests is in `.internal/src/plugins/api/main.ts`, and that directory contains sibling files for each asset type. We hook into the vite development server with `express` to facilitate easier handling of api calls.

### Migrations

Persisted assets must be resilient to schema changes in the file format. As such, each asset type is versioned and has a `migrations` folder which contains callbacks for migrating from version N to version N+1. When an asset is loaded, the asset's version should be compared with the current schema version (defined in the `schema.ts`), and if it is out of date, the sequence of migrations should be run until the asset is current, at which point it is re-saved.

If changes are made to the definitions of objects that are part of data that is persisted to disk, it is important to create a migration for old data, and to bump the latest version of the schema being persisted.

### State

State is held in Redux using Redux RTK. The main store can be seen in `.internal/src/store/store.ts`, which sets up the root reducer, composed of our subreducers. We also have several middleware for autosaving assets and reconciling pixi.js canvas state.

### Pixi.js integration

Many of the components in the editor (like the map and tileset editors) use a pixi.js canvas to display their contents. The code that manages the pixi.js rendering is held in `.internal/src/editor` and there is a subfolder for each editor type that is being managed by a separate pixi.js application instance.

The state of each pixi.js application must be kept in sync with the redux state. The authoritative state source is the redux store. To keep pixi.js in sync, we have a `Reconciler` class (.internal/src/editor/common/reconciler.ts) which knows how to create, update, and delete pixi.js objects. An instance of this reconciler class is used in redux middlewares, so that when a state-mutating action takes place, the reconciler can propagate that change to the pixi.js canvas.

# Common commands

All `npm` commands will need to use the prefix `--prefix /workspaces/getlost-level-template/.internal`, because that is where our root is located. So for example, to install a new package:

`npm --prefix /workspaces/getlost-level-template/.internal install react-router`

Assume all npm and npx commands below use that prefix.

## Restarting vite

We use `pm2` to manage the `vite` process. Restarting vite involves running:

`npx pm2 restart preview`

## Checking types

`npm run typecheck`
