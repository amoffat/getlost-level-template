import { loadTileset, loadTilesets } from "@/persist/api";
import { NpcEditorState } from "@/slices/npcEditor";
import { NpcSpritesheet } from "@/types/npc";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { actions } from "../slices/npcEditor";

export const selectTilesetThunk = createAsyncThunk(
  "npcEditor/selectTilesetThunk",
  async (ts: NpcSpritesheet, { dispatch, getState }) => {
    const state = getState() as { npcEditor: NpcEditorState };

    if (ts.id === state.npcEditor.activeTilesetId) {
      // Already active
      return true;
    }

    // Add it to pixi.js
    // await setCanvasTileset(ts);
    // Set it as active, which loads its zoom/pan state
    dispatch(actions.setActiveTileset(ts));
  }
);

export const loadTilesetsThunk = createAsyncThunk(
  "npcEditor/loadTilesetsThunk",
  async (_, { dispatch }) => {
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      const ts = await loadTileset(tsId);
      dispatch(actions.addTileset({ tsId, ts }));
    }
  }
);
