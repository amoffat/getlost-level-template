The Get Lost Level template is a local devcontainer application written in primarily Typescript, using React, Redux RTK, and Mantine. The purpose of the app is to provide a browser-based local development environment for producing levels for a 2.5D pixel art game engine called Get Lost.

## Entrypoint

`.internal/src/main.ts` is the main entrypoint, which immediately imports `shell.tsx`, which sets up the root react component, wrapped in our various providers. The main "shell" of the app lives in `.internal/src/components/ShellApp.tsx` and this contains the main tabbed interface.

## UI

As previously mentioned, the UI is React + Typescript + Redux RTK + Mantine. We use React Router for url path handling, and it should continue to be used for new paths and assets going forward, where it makes sense. We prefer Tabler icons for icon components.

### Tools

Tools are defined in `.internal/src/components/tools`.

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

Many of the components in the editor (like the map and tileset editors) use a pixi.js canvas to display their contents. The code that manages the pixi.js rendering is held in `.internal/src/editors/` and there is a subfolder for each editor type that is being managed by a separate pixi.js application instance.

The state of each pixi.js application must be kept in sync with the redux state. The authoritative state source is the redux store. To keep pixi.js in sync, we have a `Reconciler` class (`.internal/src/editors/common/reconciler.ts`) which knows how to create, update, and delete pixi.js objects. An instance of this reconciler class is used in redux middlewares, so that when a state-mutating action takes place, the reconciler can propagate that change to the pixi.js canvas.

## Internationalization / Localization

There's actually 2 systems being used for i18n and l10n. The first system is for the editor's UI, and it uses react-i18next and the associated `t("key")` calls. The translation files for this system are stored in `.internal/public/locales/{{locale}}/{{ns}}.json`. The second system is for the level translations, and this is a separate, custom localization system. Its translation files are stored in `level/locales/{{locale}}/ns.jsonl`. The level translation system doesn't use `t()` calls, because the editor has tooling to edit translation entries directly within different input fields. When a user edits a translation entry from within the editor, it syncs back to the translation files automatically. This is unlike the editor UI translation system, which just relies on the hard-coded translation files and the `t()` calls.

## UI Preferences

- Prefer CSS modules to many inline styles

## Style preferences

- Functions with more than a few arguments, or functions that will naturally expand over time, should use a destructured object instead of positional arguments.
- `private` methods should start with an underscore.
