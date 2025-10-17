import { TabName } from "@/types/tab";

export const DEFAULT_TAB: TabName = "map-editor";

export const tabToPath = (tab: TabName): string => {
  switch (tab) {
    case "map-editor":
      return "/map";
    case "tileset-editor":
      return "/tilesets";
    case "npc-editor":
      return "/npcs";
    case "story-editor":
      return "/story";
    case "dialogue-editor":
      return "/dialogue";
    case "preview":
      return "/preview";
  }
};

export const pathToTab = (path: string): TabName => {
  const clean = path.replace(/\/+$/, "");
  switch (clean) {
    case "":
    case "/":
    case "/map":
      return "map-editor";
    case "/tilesets":
      return "tileset-editor";
    case "/npcs":
      return "npc-editor";
    case "/story":
      return "story-editor";
    case "/dialogue":
      return "dialogue-editor";
    case "/preview":
      return "preview";
    default:
      return DEFAULT_TAB;
  }
};
