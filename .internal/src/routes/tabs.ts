import { MainTabName } from "@/types/tab";

export const DEFAULT_TAB: MainTabName = "map-editor";

export const tabToPath = (tab: MainTabName): string => {
  switch (tab) {
    case "map-editor":
      return "/map";
    case "tileset-editor":
      return "/tilesets";
    case "story-editor":
      return "/story";
    case "dialogue-editor":
      return "/dialogues";
    case "preview":
      return "/preview";
  }
};

export const pathToTab = (path: string): MainTabName => {
  const clean = path.replace(/\/+$/, "");
  switch (clean) {
    case "":
    case "/":
    case "/map":
      return "map-editor";
    case "/tilesets":
      return "tileset-editor";
    case "/story":
      return "story-editor";
    case "/dialogues":
      return "dialogue-editor";
    case "/preview":
      return "preview";
    default:
      // Treat any nested tilesets path (e.g., /tilesets/:tsid) as the tileset editor tab
      if (clean.startsWith("/tilesets/")) return "tileset-editor";
      // Treat any nested dialogue path (e.g., /dialogues/:dlgid) as the dialogue editor tab
      if (clean.startsWith("/dialogues/")) return "dialogue-editor";
      return DEFAULT_TAB;
  }
};
