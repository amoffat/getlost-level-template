import { pathToTab } from "@/routes/tabs";
import { MainTabName, TilesetTabName } from "@/types/tab";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  activeTab: MainTabName;
  // Track active tab and which tabs have been mounted at least once
  mountedTabs: Partial<Record<MainTabName, boolean>>;
  tags: {
    tilesetGroups: Record<string, number>;
  };
  loadingMessages: string[];
  loadingPalette: boolean;
  // Whether the Tip component is collapsed (hides text/buttons but keeps alert visible)
  tipCollapsed: boolean;
  tilesetTab: TilesetTabName;
}

// Derive default tab from current URL path when in the browser; fallback to map-editor in non-DOM contexts
const defaultTab: MainTabName = pathToTab(window.location?.pathname ?? "/");

const initialState: UIState = {
  activeTab: defaultTab,
  mountedTabs: {
    [defaultTab]: true,
  },
  tags: {
    tilesetGroups: {},
  },
  loadingMessages: [],
  loadingPalette: false,
  tipCollapsed: false,
  tilesetTab: "objects",
};

export const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTab: (state, action: PayloadAction<MainTabName>) => {
      state.activeTab = action.payload;
      state.mountedTabs[action.payload] = true;
    },
    loadingPalette(state, action: PayloadAction<boolean>) {
      state.loadingPalette = action.payload;
    },
    pushLoadingMessage(state, action: PayloadAction<string>) {
      state.loadingMessages.push(action.payload);
    },
    popLoadingMessage(state) {
      state.loadingMessages.pop();
    },
    clearLoadingMessages(state) {
      state.loadingMessages = [];
    },
    mountTab: (state, action: PayloadAction<MainTabName>) => {
      state.mountedTabs[action.payload] = true;
    },
    addTilesetGroupTags(state, action: PayloadAction<string[]>) {
      action.payload.forEach((tag) => {
        state.tags.tilesetGroups[tag] =
          (state.tags.tilesetGroups[tag] ?? 0) + 1;
      });
    },
    removeTilesetGroupTags(state, action: PayloadAction<string[]>) {
      action.payload.forEach((tag) => {
        const count = state.tags.tilesetGroups[tag];
        if (count) {
          if (count <= 1) {
            delete state.tags.tilesetGroups[tag];
          } else {
            state.tags.tilesetGroups[tag] = count - 1;
          }
        }
      });
    },
    setTipCollapsed(state, action: PayloadAction<boolean>) {
      state.tipCollapsed = action.payload;
    },
    setTilesetTab(state, action: PayloadAction<TilesetTabName>) {
      state.tilesetTab = action.payload;
    },
  },
  selectors: {
    selectTilesetGroupTags: createSelector.withTypes<UIState>()(
      [(state) => state.tags.tilesetGroups],
      // The tag list sorted by frequency
      (tags) => {
        return Object.entries(tags)
          .sort((a, b) => b[1] - a[1])
          .filter((e) => e[1] > 0)
          .map((e) => e[0]);
      }
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
