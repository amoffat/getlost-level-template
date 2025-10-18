import { pathToTab } from "@/routes/tabs";
import { TabName } from "@/types/tab";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  activeTab: TabName;
  // Track active tab and which tabs have been mounted at least once
  mountedTabs: Partial<Record<TabName, boolean>>;
  tags: {
    tilesetGroups: Record<string, number>;
  };
  loadingMessage: string | null;
  loadingPalette: boolean;
}

// Derive default tab from current URL path when in the browser; fallback to map-editor in non-DOM contexts
const defaultTab: TabName = pathToTab(window.location?.pathname ?? "/");

const initialState: UIState = {
  activeTab: defaultTab,
  mountedTabs: {
    [defaultTab]: true,
  },
  tags: {
    tilesetGroups: {},
  },
  loadingMessage: null,
  loadingPalette: false,
};

export const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTab: (state, action: PayloadAction<TabName>) => {
      state.activeTab = action.payload;
      state.mountedTabs[action.payload] = true;
    },
    loadingPalette(state, action: PayloadAction<boolean>) {
      state.loadingPalette = action.payload;
    },
    setLoadingMessage(state, action: PayloadAction<string | null>) {
      state.loadingMessage = action.payload;
    },
    mountTab: (state, action: PayloadAction<TabName>) => {
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
