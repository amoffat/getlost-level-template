import { TabName } from "@/types/tab";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  activeTab: TabName;
  // Track active tab and which tabs have been mounted at least once
  mountedTabs: Partial<Record<TabName, boolean>>;
}

const defaultTab: TabName = "tileset-editor";

const initialState: UIState = {
  activeTab: defaultTab,
  mountedTabs: {
    [defaultTab]: true,
  },
};

const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTab: (state, action: PayloadAction<TabName>) => {
      state.activeTab = action.payload;
    },
    mountTab: (state, action: PayloadAction<TabName>) => {
      state.mountedTabs[action.payload] = true;
    },
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
