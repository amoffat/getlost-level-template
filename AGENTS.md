The Get Lost Level template is a local devcontainer application written in primarily Typescript, using React, Redux RTK, and Mantine. The purpose of the app is to provide a browser-based local development environment for producing levels for a 2.5D pixel art game engine called Get Lost.

# Architecture

The architecture is divided into two separate areas: level and internal. Whether or not a user of this repository works in one folder or the other is based on their intentions. Level designers, who simply want to use this repository to develop a level, will stay in the `/level` folder. However, users who want to advance the level editor itself will work in the `/.internal` folder. Some users may wish to develop a level and also add to the level editor itself, in which case they may work in both folders.

# Commands

All `npm` commands will need to use the prefix `--prefix /workspaces/getlost-level-template/.internal`, because that is where our application root is located. So for example, to install a new package:

`npm --prefix /workspaces/getlost-level-template/.internal install react-router`

All npm and npx commands must use that prefix. Assume that all commands below use that prefix.

- To restart vite: `npx pm2 restart preview`
- To check types: `npm run typecheck`
