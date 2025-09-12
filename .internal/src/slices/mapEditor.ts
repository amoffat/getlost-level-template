import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActiveLayer, LayerData } from "../types/layer";
import { TileObject } from "../types/object";
import { TileGroup } from "../types/tilegroup";

type Mode = null | "pan" | "place";

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  mode: Mode;
  place?: {
    id: string;
  };
  layers: {
    active: ActiveLayer;
    dimInactive: boolean;
    layerData: Record<ActiveLayer, LayerData>;
  };
  objPalette: TileObject[];
}

const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    mode: null,
    layers: {
      active: "ground",
      dimInactive: true,
      layerData: {},
    },
  } as MapEditorState,
  reducers: {
    setActiveLayer(state, action: { payload: ActiveLayer }) {
      state.layers.active = action.payload;
    },
    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase<string, PayloadAction<TileGroup>>(
        "tilesetEditor/addGroup",
        (state, { payload }) => {
          //   console.log(payload);
          //   const to = new TileObject();
          //   state.mode = null;
          //   state.place = undefined;
        }
      )
      .addDefaultCase(() => {});
  },
});

export const actions = slice.actions;
export default slice.reducer;
