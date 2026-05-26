The Get Lost Level template is a local devcontainer application written in primarily Typescript, using React, Redux RTK, and Mantine. The purpose of the app is to provide a browser-based local development environment for producing levels for a 2.5D pixel art game engine called Get Lost.

# Architecture

The architecture is divided into two separate areas: level and internal. Whether or not a user of this repository works in one folder or the other is based on their intentions. Level designers, who simply want to use this repository to develop a level, will stay in the `/level` folder. However, users who want to advance the level editor itself will work in the `/.internal` folder. Some users may wish to develop a level and also add to the level editor itself, in which case they may work in both folders.

# Commands

All `pnpm` commands will need to use the `--dir` flag pointing to `/workspaces/getlost-level-template/.internal`, because that is where our application root is located. So for example, to install a new package:

`pnpm --dir /workspaces/getlost-level-template/.internal add react-router`

All pnpm and `pnpm exec` commands must use that `--dir` flag. Assume that all commands below use it.

- To restart vite: `pnpm --dir /workspaces/getlost-level-template/.internal exec pm2 restart preview`
- To check types: `pnpm --dir /workspaces/getlost-level-template/.internal run typecheck`
